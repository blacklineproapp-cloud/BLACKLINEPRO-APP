import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

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
 * POST - Mesclar dados de usuários duplicados
 *
 * Body:
 * {
 *   "keepUserId": "id-do-usuario-para-manter",
 *   "deleteUserId": "id-do-usuario-para-deletar"
 * }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { keepUserId, deleteUserId } = body;

    if (!keepUserId || !deleteUserId) {
      return NextResponse.json(
        { error: 'Forneça keepUserId e deleteUserId' },
        { status: 400 }
      );
    }

    console.log('[Merge] Iniciando mesclagem...');
    console.log('[Merge] Manter:', keepUserId);
    console.log('[Merge] Deletar:', deleteUserId);

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

    console.log('[Merge] Dados mesclados:', mergedData);

    // 3. Atualizar usuário que será mantido
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(mergedData)
      .eq('id', keepUserId);

    if (updateError) {
      console.error('[Merge] Erro ao atualizar:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('[Merge] ✅ Usuário atualizado');

    // 4. Deletar usuário antigo
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', deleteUserId);

    if (deleteError) {
      console.error('[Merge] Erro ao deletar:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log('[Merge] ✅ Usuário antigo deletado');

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

  } catch (error: any) {
    console.error('[Merge] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
