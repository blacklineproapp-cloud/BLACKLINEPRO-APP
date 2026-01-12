import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminAction } from '@/lib/admin-audit';

// Schema de validação
const revokeCourtesySchema = z.object({
  userId: z.string().uuid('ID de usuário inválido'),
  reason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres').max(500)
});

export async function POST(req: Request) {
  try {
    // 1. 🔒 VERIFICAR ADMIN
    const { userId } = await auth();
    
    if (!userId || !(await isAdmin(userId))) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // 2. 🔍 VALIDAR INPUT
    const body = await req.json();
    const validated = revokeCourtesySchema.parse(body);

    // 3. 📧 BUSCAR USUÁRIO
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, admin_courtesy, subscription_id')
      .eq('id', validated.userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // 4. ⚠️ VERIFICAR SE TEM SUBSCRIPTION ATIVA
    if (targetUser.subscription_id) {
      return NextResponse.json(
        { 
          error: 'Não é possível revogar cortesia de usuário com assinatura ativa',
          details: 'Cancele a assinatura no Stripe primeiro'
        },
        { status: 400 }
      );
    }

    // 5. ⚠️ VERIFICAR SE TEM CORTESIA
    if (!targetUser.admin_courtesy) {
      return NextResponse.json(
        { error: 'Usuário não possui cortesia ativa' },
        { status: 400 }
      );
    }

    // 6. ❌ REVOGAR CORTESIA
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        admin_courtesy: false,
        admin_courtesy_expires_at: null,
        plan: 'free',
        is_paid: false,
        tools_unlocked: false,
        subscription_status: 'inactive'
      })
      .eq('id', targetUser.id);

    if (updateError) {
      console.error('[Courtesy] Erro ao revogar:', updateError);
      return NextResponse.json(
        { error: 'Erro ao revogar cortesia' },
        { status: 500 }
      );
    }

    // 7. 📝 REGISTRAR NO AUDIT LOG
    await logAdminAction({
      adminId: userId,
      action: 'revoke_courtesy',
      targetUserId: targetUser.id,
      metadata: {
        reason: validated.reason,
        user_email: targetUser.email,
        previous_plan: targetUser.admin_courtesy
      }
    });

    // 8. ✅ RETORNAR SUCESSO
    return NextResponse.json({
      success: true,
      message: 'Cortesia revogada com sucesso',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name
      }
    });

  } catch (error: any) {
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
