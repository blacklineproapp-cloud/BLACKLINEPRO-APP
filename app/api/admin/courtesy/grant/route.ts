import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminAction } from '@/lib/admin-audit';

// Schema de validação
const grantCourtesySchema = z.object({
  userEmail: z.string().email('Email inválido'),
  plan: z.enum(['starter', 'pro', 'studio'], {
    message: 'Plano deve ser starter, pro ou studio'
  }),
  expirationDate: z.string().datetime('Data de expiração inválida'),
  sendEmail: z.boolean().default(false),
  notes: z.string().max(500, 'Notas muito longas (máximo 500 caracteres)').optional()
});

export async function POST(req: Request) {
  try {
    // 1. 🔒 VERIFICAR AUTENTICAÇÃO E PERMISSÃO ADMIN
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Acesso negado - apenas administradores' },
        { status: 403 }
      );
    }

    // 2. 🔍 VALIDAR INPUT COM ZOD
    const body = await req.json();
    const validated = grantCourtesySchema.parse(body);

    // 3. 📧 BUSCAR USUÁRIO PELO EMAIL (case-insensitive)
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, plan, admin_courtesy, subscription_id, asaas_subscription_id')
      .ilike('email', validated.userEmail)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // 4. ⚠️ VERIFICAR SE JÁ TEM SUBSCRIPTION ATIVA (Stripe ou Asaas)
    if (targetUser.subscription_id || targetUser.asaas_subscription_id) {
      return NextResponse.json(
        { 
          error: 'Usuário já possui assinatura ativa',
          details: 'Não é possível conceder cortesia para usuários com pagamento recorrente ativo'
        },
        { status: 400 }
      );
    }

    // 5. ✅ CONCEDER CORTESIA
    const expirationDate = new Date(validated.expirationDate);
    
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        admin_courtesy: true,
        admin_courtesy_expires_at: expirationDate.toISOString(),
        admin_courtesy_granted_at: new Date().toISOString(),
        admin_courtesy_granted_by: userId,
        plan: validated.plan,
        is_paid: true,
        tools_unlocked: true,
        subscription_status: 'active'
      })
      .eq('id', targetUser.id);

    if (updateError) {
      console.error('[Courtesy] Erro ao conceder:', updateError);
      return NextResponse.json(
        { error: 'Erro ao conceder cortesia' },
        { status: 500 }
      );
    }

    // 6. 📝 REGISTRAR NO AUDIT LOG
    await logAdminAction({
      adminId: userId,
      action: 'grant_courtesy',
      targetUserId: targetUser.id,
      metadata: {
        plan: validated.plan,
        expires_at: expirationDate.toISOString(),
        notes: validated.notes,
        user_email: targetUser.email
      }
    });

    // 7. 📧 ENVIAR EMAIL (se solicitado)
    if (validated.sendEmail) {
      try {
        // TODO: Implementar envio de email
        console.log('[Courtesy] Email de cortesia será enviado para:', targetUser.email);
      } catch (emailError) {
        console.error('[Courtesy] Erro ao enviar email:', emailError);
        // Não falhar a operação por causa do email
      }
    }

    // 8. ✅ RETORNAR SUCESSO
    return NextResponse.json({
      success: true,
      message: 'Cortesia concedida com sucesso',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        plan: validated.plan,
        expires_at: expirationDate.toISOString()
      }
    });

  } catch (error: any) {
    // Erro de validação Zod
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }

    console.error('[Courtesy] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
