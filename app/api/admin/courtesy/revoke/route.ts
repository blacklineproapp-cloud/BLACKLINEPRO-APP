import { withAdminAuth } from '@/lib/api-middleware';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminAction } from '@/lib/admin-audit';
import { logger } from '@/lib/logger';

// Schema de validação
const revokeCourtesySchema = z.object({
  userId: z.string().uuid('ID de usuário inválido'),
  reason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres').max(500)
});

export const POST = withAdminAuth(async (req, { adminId }) => {
    // 2. 🔍 VALIDAR INPUT
    let validated;
    try {
      const body = await req.json();
      validated = revokeCourtesySchema.parse(body);
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
      throw error;
    }

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
      logger.error('[Courtesy] Erro ao revogar', { error: updateError });
      return NextResponse.json(
        { error: 'Erro ao revogar cortesia' },
        { status: 500 }
      );
    }

    // 7. 📝 REGISTRAR NO AUDIT LOG
    await logAdminAction({
      adminId: adminId,
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
});
