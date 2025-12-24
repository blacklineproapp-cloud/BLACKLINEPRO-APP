import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Emails com acesso admin
const ADMIN_EMAILS = [
  'erickrussomat@gmail.com',
  'yurilojavirtual@gmail.com',
];

async function isAdmin(userId: string): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email, is_admin')
    .eq('clerk_id', userId)
    .single();

  return user ? (ADMIN_EMAILS.includes(user.email) || user.is_admin) : false;
}

/**
 * POST /api/admin/migrate-users
 * 
 * Migra usuários pagantes do app antigo para o novo
 * Define subscription_expires_at = 2025-01-05 (renovação)
 * 
 * Body:
 * {
 *   emails: string[],     // Lista de emails a migrar
 *   plan?: string,        // Plano (default: 'pro')
 *   expiresAt?: string    // Data de expiração (default: '2025-01-05')
 * }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { emails, plan = 'pro', expiresAt = '2025-01-05T23:59:59-03:00' } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ 
        error: 'Lista de emails é obrigatória',
        example: { emails: ['email1@example.com', 'email2@example.com'] }
      }, { status: 400 });
    }

    // Validar plano
    const validPlans = ['starter', 'pro', 'studio'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ 
        error: 'Plano inválido',
        validPlans 
      }, { status: 400 });
    }

    const results = {
      success: [] as string[],
      notFound: [] as string[],
      errors: [] as { email: string; error: string }[],
    };

    // Processar cada email
    for (const email of emails) {
      try {
        const normalizedEmail = email.trim().toLowerCase();

        // Buscar usuário por email
        const { data: user, error: findError } = await supabaseAdmin
          .from('users')
          .select('id, email, plan, is_paid')
          .eq('email', normalizedEmail)
          .single();

        if (findError || !user) {
          results.notFound.push(normalizedEmail);
          continue;
        }

        // Atualizar usuário
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            is_paid: true,
            subscription_status: 'active',
            plan: plan,
            tools_unlocked: plan === 'pro' || plan === 'studio',
            subscription_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          results.errors.push({ email: normalizedEmail, error: updateError.message });
          continue;
        }

        results.success.push(normalizedEmail);

        // Registrar log
        await supabaseAdmin.from('plan_changes').insert({
          user_id: user.id,
          old_plan: user.plan,
          new_plan: plan,
        });

      } catch (err: any) {
        results.errors.push({ email, error: err.message });
      }
    }

    return NextResponse.json({
      message: 'Migração concluída',
      summary: {
        total: emails.length,
        migrated: results.success.length,
        notFound: results.notFound.length,
        errors: results.errors.length,
      },
      results,
      config: {
        plan,
        expiresAt,
      }
    });

  } catch (error: any) {
    console.error('Erro na migração:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/migrate-users
 * 
 * Retorna instruções de uso
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/migrate-users',
    method: 'POST',
    description: 'Migra usuários pagantes do app antigo para o novo',
    body: {
      emails: ['email1@example.com', 'email2@example.com'],
      plan: 'pro (opcional, default: pro)',
      expiresAt: '2025-01-05T23:59:59-03:00 (opcional)',
    },
    notes: [
      'Usuários precisam já existir no banco (ter feito login via Clerk)',
      'Se email não existir, será listado em "notFound"',
      'Após 05/01, usuários serão bloqueados até renovarem',
    ]
  });
}
