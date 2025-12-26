import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Emails admin com acesso a essa rota
const ADMIN_EMAILS = ['erickrussomat@gmail.com', 'yurilojavirtual@gmail.com'];

async function isAdmin(userId: string): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('clerk_id', userId)
    .single();

  const userEmailLower = user?.email?.toLowerCase() || '';
  return user ? ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower) : false;
}

/**
 * GET - Listar usuários duplicados
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    console.log('[Cleanup] Procurando usuários duplicados...');

    // Buscar TODOS os usuários
    const { data: allUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, clerk_id, email, created_at, is_paid, subscription_status')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar por email (case-insensitive)
    const emailGroups: Record<string, typeof allUsers> = {};

    allUsers?.forEach(user => {
      const emailLower = user.email?.toLowerCase() || '';
      if (!emailGroups[emailLower]) {
        emailGroups[emailLower] = [];
      }
      emailGroups[emailLower].push(user);
    });

    // Encontrar duplicados (mais de 1 usuário com mesmo email)
    const duplicates = Object.entries(emailGroups)
      .filter(([_, users]) => users.length > 1)
      .map(([email, users]) => ({
        email,
        count: users.length,
        users: users.map(u => ({
          id: u.id,
          clerk_id: u.clerk_id,
          created_at: u.created_at,
          is_paid: u.is_paid,
          subscription_status: u.subscription_status
        }))
      }));

    console.log(`[Cleanup] Encontrados ${duplicates.length} emails duplicados`);

    return NextResponse.json({
      success: true,
      duplicates,
      totalEmails: Object.keys(emailGroups).length,
      duplicatedEmails: duplicates.length,
      suggestion: duplicates.length > 0
        ? 'Use POST /api/admin/cleanup-duplicates para remover automaticamente'
        : 'Nenhum usuário duplicado encontrado'
    });

  } catch (error: any) {
    console.error('[Cleanup] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST - Limpar usuários duplicados (mantém o mais antigo)
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    console.log('[Cleanup] Iniciando limpeza de duplicados...');

    // Buscar TODOS os usuários
    const { data: allUsers, error } = await supabaseAdmin
      .from('users')
      .select('id, clerk_id, email, created_at, is_paid')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar por email
    const emailGroups: Record<string, typeof allUsers> = {};

    allUsers?.forEach(user => {
      const emailLower = user.email?.toLowerCase() || '';
      if (!emailGroups[emailLower]) {
        emailGroups[emailLower] = [];
      }
      emailGroups[emailLower].push(user);
    });

    // Processar duplicados
    const results = [];
    let totalDeleted = 0;

    for (const [email, users] of Object.entries(emailGroups)) {
      if (users.length <= 1) continue; // Não é duplicado

      // ESTRATÉGIA: Manter o primeiro (mais antigo) OU o que tem assinatura paga
      const paidUser = users.find(u => u.is_paid);
      const toKeep = paidUser || users[0]; // Manter o pago, ou o mais antigo

      // Deletar os outros
      const toDelete = users.filter(u => u.id !== toKeep.id);

      for (const user of toDelete) {
        const { error: deleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', user.id);

        if (deleteError) {
          console.error(`[Cleanup] Erro ao deletar ${user.email}:`, deleteError);
          results.push({
            email,
            action: 'ERROR',
            kept: toKeep.id,
            deleted: user.id,
            error: deleteError.message
          });
        } else {
          console.log(`[Cleanup] ✅ Deletado: ${user.email} (ID: ${user.id})`);
          totalDeleted++;
          results.push({
            email,
            action: 'DELETED',
            kept: toKeep.id,
            deleted: user.id
          });
        }
      }
    }

    console.log(`[Cleanup] Concluído! ${totalDeleted} usuários deletados`);

    return NextResponse.json({
      success: true,
      message: `${totalDeleted} usuários duplicados removidos`,
      totalDeleted,
      details: results
    });

  } catch (error: any) {
    console.error('[Cleanup] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
