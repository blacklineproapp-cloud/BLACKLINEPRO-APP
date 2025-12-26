import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { getPriceIdFromPlan } from '@/lib/billing/stripe-plan-mapping';
import type { BillingCycle } from '@/lib/stripe/types';

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
 * POST - Ativar usuário com Grace Period (período gratuito até data específica)
 * Body: {
 *   userId: string,
 *   gracePeriodUntil: string (ISO date),
 *   targetPlan: 'starter' | 'pro' | 'studio',
 *   cycle: 'monthly' | 'quarterly' | 'semiannual' | 'yearly',
 *   autoBillAfter: boolean
 * }
 *
 * Exemplo para usuários migrados:
 * - gracePeriodUntil: "2025-01-10T23:59:59Z"
 * - autoBillAfter: true
 * - Cria subscription no Stripe com trial_end = 10 de janeiro
 * - No dia 11, Stripe automaticamente cobra o primeiro pagamento
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId || !await isAdmin(userId)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      userId: userIdToActivate,
      gracePeriodUntil,
      targetPlan = 'pro',
      cycle = 'monthly',
      autoBillAfter = true
    } = body;

    // Validar inputs
    if (!userIdToActivate) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    if (!gracePeriodUntil) {
      return NextResponse.json(
        { error: 'gracePeriodUntil é obrigatório' },
        { status: 400 }
      );
    }

    // Validar plano
    if (!['starter', 'pro', 'studio'].includes(targetPlan)) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      );
    }

    // Validar ciclo
    const validCycles: BillingCycle[] = ['monthly', 'quarterly', 'semiannual', 'yearly'];
    if (!validCycles.includes(cycle as BillingCycle)) {
      return NextResponse.json(
        { error: 'Ciclo de pagamento inválido' },
        { status: 400 }
      );
    }

    // Validar data
    const graceDate = new Date(gracePeriodUntil);
    if (isNaN(graceDate.getTime())) {
      return NextResponse.json(
        { error: 'Data de grace period inválida' },
        { status: 400 }
      );
    }

    // Verificar se grace period está no futuro
    if (graceDate <= new Date()) {
      return NextResponse.json(
        { error: 'Grace period deve ser uma data futura' },
        { status: 400 }
      );
    }

    console.log('[Activate with Grace] Iniciando ativação:', {
      userId: userIdToActivate,
      plan: targetPlan,
      cycle,
      gracePeriodUntil,
      autoBillAfter
    });

    // Buscar usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userIdToActivate)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    let stripeSubscriptionId: string | null = null;

    // Se autoBillAfter = true, criar subscription no Stripe com trial
    if (autoBillAfter) {
      try {
        // 1. Buscar ou criar customer no Stripe
        const { data: existingCustomer } = await supabaseAdmin
          .from('customers')
          .select('stripe_customer_id')
          .eq('user_id', userIdToActivate)
          .single();

        let stripeCustomerId: string;

        if (existingCustomer?.stripe_customer_id) {
          stripeCustomerId = existingCustomer.stripe_customer_id;
          console.log('[Activate with Grace] Customer já existe:', stripeCustomerId);
        } else {
          // Criar customer no Stripe
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name || undefined,
            metadata: {
              clerk_id: user.clerk_id,
              user_id: userIdToActivate
            }
          });

          stripeCustomerId = customer.id;

          // Salvar customer no banco
          await supabaseAdmin.from('customers').insert({
            user_id: userIdToActivate,
            stripe_customer_id: customer.id,
            email: user.email,
            nome: user.name
          });

          console.log('[Activate with Grace] Customer criado:', customer.id);
        }

        // 2. Obter Price ID do Stripe
        const priceId = getPriceIdFromPlan(targetPlan, cycle as BillingCycle);

        // 3. Criar subscription com trial_end = grace period
        const trialEndTimestamp = Math.floor(graceDate.getTime() / 1000);

        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          trial_end: trialEndTimestamp,
          billing_cycle_anchor: trialEndTimestamp,
          metadata: {
            clerk_id: user.clerk_id,
            user_id: userIdToActivate,
            plan: targetPlan,
            cycle: cycle,
            grace_period: 'true'
          }
        });

        stripeSubscriptionId = subscription.id;

        // 4. Registrar subscription no banco
        const { data: customer } = await supabaseAdmin
          .from('customers')
          .select('id')
          .eq('stripe_customer_id', stripeCustomerId)
          .single();

        await supabaseAdmin.from('subscriptions').insert({
          customer_id: customer?.id,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          stripe_product_id: typeof subscription.items.data[0].price.product === 'string'
            ? subscription.items.data[0].price.product
            : subscription.items.data[0].price.product.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          trial_start: subscription.trial_start
            ? new Date(subscription.trial_start * 1000).toISOString()
            : null,
          trial_end: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          metadata: subscription.metadata
        });

        console.log('[Activate with Grace] Subscription criada:', subscription.id);
      } catch (stripeError: any) {
        console.error('[Activate with Grace] Erro ao criar subscription:', stripeError);
        return NextResponse.json(
          { error: 'Erro ao criar subscription no Stripe: ' + stripeError.message },
          { status: 500 }
        );
      }
    }

    // 5. Atualizar usuário no banco
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        is_paid: true,
        subscription_status: 'trialing',
        subscription_id: stripeSubscriptionId,
        subscription_expires_at: gracePeriodUntil,
        tools_unlocked: targetPlan === 'pro' || targetPlan === 'studio',
        plan: targetPlan,
        grace_period_until: gracePeriodUntil,
        auto_bill_after_grace: autoBillAfter
      })
      .eq('id', userIdToActivate)
      .select('email, plan, grace_period_until, auto_bill_after_grace, subscription_id')
      .single();

    if (updateError) {
      console.error('[Activate with Grace] Erro ao atualizar usuário:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('[Activate with Grace] ✅ Usuário ativado com grace period:', updatedUser.email);

    return NextResponse.json({
      success: true,
      message: 'Usuário ativado com grace period',
      user: {
        id: userIdToActivate,
        email: updatedUser.email,
        plan: updatedUser.plan,
        grace_period_until: updatedUser.grace_period_until,
        auto_bill_after: updatedUser.auto_bill_after_grace,
        subscription_id: updatedUser.subscription_id,
        billing_info: autoBillAfter
          ? `Cobrança automática iniciará em ${new Date(gracePeriodUntil).toLocaleDateString('pt-BR')}`
          : 'Sem cobrança automática configurada'
      }
    });

  } catch (error: any) {
    console.error('[Activate with Grace] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
