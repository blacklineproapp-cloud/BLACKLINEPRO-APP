import { withAdminAuth } from '@/lib/api-middleware';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { logAdminAction } from '@/lib/admin-audit';
import { logger } from '@/lib/logger';

// Schema de validação
const removeCreditsSchema = z.object({
  userEmail: z.string().email('Email inválido'),
  amount: z.number().int('Quantidade deve ser inteira').min(1, 'Mínimo 1 crédito').max(10000, 'Máximo 10000 créditos por vez'),
  reason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres').max(500)
});

export const POST = withAdminAuth(async (req, { userId }) => {
  try {
    // 1. 🔍 VALIDAR INPUT
    const body = await req.json();
    const validated = removeCreditsSchema.parse(body);

    // 2. 📧 BUSCAR USUÁRIO (case-insensitive)
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, credits, plan')
      .ilike('email', validated.userEmail)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // 3. ⚠️ VERIFICAR SALDO
    const currentCredits = targetUser.credits || 0;
    if (currentCredits < validated.amount) {
      return NextResponse.json(
        {
          error: 'Saldo insuficiente',
          details: `Usuário tem apenas ${currentCredits} créditos`
        },
        { status: 400 }
      );
    }

    // 4. ➖ REMOVER CRÉDITOS
    const newCredits = currentCredits - validated.amount;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ credits: newCredits })
      .eq('id', targetUser.id);

    if (updateError) {
      logger.error('[Credits] Erro ao remover', { error: updateError });
      return NextResponse.json(
        { error: 'Erro ao remover créditos' },
        { status: 500 }
      );
    }

    // 5. 📝 REGISTRAR TRANSAÇÃO
    await supabaseAdmin.from('credit_transactions').insert({
      user_id: targetUser.id,
      amount: -validated.amount, // Negativo para remoção
      type: 'admin_remove',
      metadata: {
        admin_id: userId,
        reason: validated.reason,
        previous_balance: currentCredits,
        new_balance: newCredits
      }
    });

    // 6. 📝 AUDIT LOG
    await logAdminAction({
      adminId: userId,
      action: 'remove_credits',
      targetUserId: targetUser.id,
      metadata: {
        amount: validated.amount,
        reason: validated.reason,
        user_email: targetUser.email,
        previous_balance: currentCredits,
        new_balance: newCredits
      }
    });

    // 7. ✅ RETORNAR SUCESSO
    return NextResponse.json({
      success: true,
      message: `${validated.amount} créditos removidos com sucesso`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        previous_credits: currentCredits,
        new_credits: newCredits
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
    throw error;
  }
});
