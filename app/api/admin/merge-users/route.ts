import { withAdminAuth } from '@/lib/api-middleware';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * POST - Mesclar dados de usuários duplicados
 *
 * Body:
 * {
 *   "keepUserId": "id-do-usuario-para-manter",
 *   "deleteUserId": "id-do-usuario-para-deletar"
 * }
 */
export const POST = withAdminAuth(async (req, { adminId }) => {
    const body = await req.json();
    const { keepUserId, deleteUserId } = body;

    if (!keepUserId || !deleteUserId) {
      return NextResponse.json(
        { error: 'Forneça keepUserId e deleteUserId' },
        { status: 400 }
      );
    }

    logger.info('[Merge] Iniciando mesclagem', { keepUserId, deleteUserId });

    // 1. Buscar dados de ambos os usuários
    const { data: keepUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', keepUserId)
      .single();

    const { data: deleteUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', deleteUserId)
      .single();

    if (!keepUser || !deleteUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 2. Mesclar dados: pegar o MELHOR de cada usuário
    const mergedData = {
      // Manter dados básicos do keepUser
      clerk_id: keepUser.clerk_id,
      email: keepUser.email,
      name: keepUser.name || deleteUser.name,
      picture: keepUser.picture || deleteUser.picture,

      // Pegar o MELHOR status de pagamento
      is_paid: keepUser.is_paid || deleteUser.is_paid,
      subscription_status:
        deleteUser.subscription_status === 'active' ? 'active' :
        keepUser.subscription_status === 'active' ? 'active' :
        deleteUser.subscription_status,

      // Pegar ferramentas desbloqueadas se qualquer um tiver
      tools_unlocked: keepUser.tools_unlocked || deleteUser.tools_unlocked,

      // Pegar stripe IDs se existirem
      stripe_customer_id: keepUser.stripe_customer_id || deleteUser.stripe_customer_id,
      stripe_subscription_id: keepUser.stripe_subscription_id || deleteUser.stripe_subscription_id,

      // Pegar créditos e limites (maior valor)
      monthly_credits: Math.max(keepUser.monthly_credits || 0, deleteUser.monthly_credits || 0),
      monthly_limit: Math.max(keepUser.monthly_limit || 0, deleteUser.monthly_limit || 0),
      plan: deleteUser.plan || keepUser.plan,

      // Manter data de criação mais antiga
      created_at: new Date(keepUser.created_at) < new Date(deleteUser.created_at)
        ? keepUser.created_at
        : deleteUser.created_at,
    };

    logger.debug('[Merge] Dados mesclados', { mergedData });

    // 3. Atualizar usuário que será mantido
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(mergedData)
      .eq('id', keepUserId);

    if (updateError) {
      logger.error('[Merge] Erro ao atualizar', { error: updateError });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    logger.info('[Merge] Usuário atualizado', { keepUserId });

    // 4. Deletar usuário antigo
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', deleteUserId);

    if (deleteError) {
      logger.error('[Merge] Erro ao deletar', { error: deleteError });
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    logger.info('[Merge] Usuário antigo deletado', { deleteUserId });

    return NextResponse.json({
      success: true,
      message: 'Usuários mesclados com sucesso',
      kept: {
        id: keepUserId,
        email: mergedData.email,
        is_paid: mergedData.is_paid,
        tools_unlocked: mergedData.tools_unlocked
      },
      deleted: {
        id: deleteUserId,
        email: deleteUser.email
      }
    });
});
