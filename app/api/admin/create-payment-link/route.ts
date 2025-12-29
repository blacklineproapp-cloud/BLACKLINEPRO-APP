import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CheckoutService } from '@/lib/stripe';
import { PRICES } from '@/lib/stripe';

// Lista de emails admin
const ADMIN_EMAILS = [
  'erickrussomat@gmail.com',
  'yurilojavirtual@gmail.com',
];

async function isAdmin(userId: string): Promise<boolean> {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('clerk_id', userId)
    .single();

  const userEmailLower = user?.email?.toLowerCase() || '';
  return ADMIN_EMAILS.some(e => e.toLowerCase() === userEmailLower);
}

export async function POST(req: Request) {
  try {
    // 1. Verificar autenticação
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 2. Verificar se é admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 3. Validar dados
    const body = await req.json();
    const { targetUserId, planType, sendEmail } = body;

    if (!targetUserId || !planType) {
      return NextResponse.json(
        { error: 'targetUserId e planType são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['starter', 'pro', 'studio'].includes(planType)) {
      return NextResponse.json(
        { error: 'planType inválido. Use: starter, pro ou studio' },
        { status: 400 }
      );
    }

    // 4. Buscar dados do usuário alvo
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, clerk_id, email, name')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // 5. Obter price_id do Stripe baseado no plano
    const priceId = planType === 'starter' 
      ? PRICES.STARTER 
      : planType === 'pro' 
      ? PRICES.PRO 
      : PRICES.STUDIO;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID não configurado para este plano' },
        { status: 500 }
      );
    }

    // 6. Buscar ID do admin
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();

    // 7. Criar checkout session do Stripe
    const { url: checkoutUrl } = await CheckoutService.createAdminCheckoutSession({
      userEmail: targetUser.email,
      userName: targetUser.name || undefined,
      priceId,
      planType,
      adminId: adminUser?.id || userId,
      clerkId: targetUser.clerk_id
    });

    // 8. Registrar ação no log
    await supabaseAdmin.from('admin_logs').insert({
      admin_user_id: adminUser?.id,
      action: 'generate_payment_link',
      target_user_id: targetUserId,
      details: {
        plan: planType,
        checkout_url: checkoutUrl,
        send_email: sendEmail || false
      }
    });

    // 9. TODO: Enviar email se solicitado
    if (sendEmail) {
      console.log('[Admin] Email automático não implementado ainda');
      // await sendPaymentLinkEmail(targetUser.email, checkoutUrl, planType);
    }

    // 10. Retornar sucesso
    return NextResponse.json({
      success: true,
      checkoutUrl,
      message: 'Link de pagamento criado com sucesso'
    });

  } catch (error: any) {
    console.error('[Admin] Erro ao criar payment link:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar link de pagamento' },
      { status: 500 }
    );
  }
}
