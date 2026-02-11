/**
 * Asaas Checkout API
 *
 * Cria assinaturas ou cobranças avulsas no Asaas
 * Suporta: PIX, Boleto, Cartão de Crédito
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getOrCreateUser } from '@/lib/auth';
import { rateLimit } from '@/lib/ratelimit';
import {
  AsaasCustomerService,
  AsaasSubscriptionService,
  AsaasPaymentService,
  ASAAS_PLANS,
  BILLING_CYCLE_MAP,
} from '@/lib/asaas';
import type {
  CreditCardData,
  CreditCardHolderInfo,
  AsaasBillingType,
} from '@/lib/asaas';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface CheckoutRequest {
  plan: 'legacy' | 'starter' | 'pro' | 'studio' | 'enterprise';
  cycle: 'monthly' | 'quarterly' | 'semiannual' | 'yearly';
  paymentMethod: 'pix' | 'boleto' | 'credit_card';
  // Para cartão de crédito
  creditCard?: CreditCardData;
  creditCardHolderInfo?: CreditCardHolderInfo;
  // CPF/CNPJ (obrigatório no Asaas)
  cpfCnpj?: string;
  phone?: string;
}

export async function POST(req: Request) {
  try {
    console.log('[Asaas Checkout] Iniciando checkout...');
    
    // 1. Autenticação
    const { userId: clerkId } = await auth();
    console.log('[Asaas Checkout] Clerk ID:', clerkId);

    if (!clerkId) {
      console.log('[Asaas Checkout] ❌ Usuário não autenticado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 2. Rate Limiting - máximo 5 tentativas por hora por usuário
    const rateLimitResult = await rateLimit(`checkout:${clerkId}`, 5, 3600);
    if (!rateLimitResult.success) {
      console.log(`[Asaas Checkout] ⚠️ Rate limit excedido para ${clerkId}`);
      return NextResponse.json({
        error: 'Muitas tentativas. Aguarde uma hora antes de tentar novamente.',
        retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
      }, { status: 429 });
    }

    // 2. Buscar ou criar usuário (garante que existe no Supabase mesmo se webhook falhou)
    console.log('[Asaas Checkout] Buscando/criando usuário no banco...');
    const user = await getOrCreateUser(clerkId);

    if (!user) {
      console.log('[Asaas Checkout] ❌ Não foi possível buscar/criar usuário');
      return NextResponse.json({ error: 'Erro ao processar usuário. Tente novamente.' }, { status: 500 });
    }

    console.log('[Asaas Checkout] ✅ Usuário encontrado:', user.email);

    // 3. Parse do request
    const body: CheckoutRequest = await req.json();
    const { plan, cycle, paymentMethod, creditCard, creditCardHolderInfo, cpfCnpj, phone } = body;

    // 4. Validar plano
    const planConfig = ASAAS_PLANS[plan];
    if (!planConfig) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    // 5. Calcular valor
    const value = planConfig.prices[cycle] || planConfig.prices.monthly;

    // 6. Validar CPF/CNPJ (obrigatório do request)
    if (!cpfCnpj || cpfCnpj.replace(/\D/g, '').length < 11) {
      return NextResponse.json({
        error: 'CPF/CNPJ obrigatório',
        requiresCpf: true,
      }, { status: 400 });
    }

    // 7. Validar telefone (recomendado mas não obrigatório)
    const validPhone = phone && phone.replace(/\D/g, '').length >= 10 ? phone : undefined;

    // 8. Buscar ou criar customer no Asaas
    const { asaasCustomer, dbCustomer } = await AsaasCustomerService.findOrCreate({
      userId: user.id,
      clerkId,
      email: user.email,
      name: user.name || user.email.split('@')[0],
      cpfCnpj: cpfCnpj,
      phone: validPhone, // Telefone real ou undefined (Asaas aceita sem telefone)
    });

    // 9. Cancelar assinatura anterior (se existir) para evitar cobranças duplicadas
    if (user.asaas_subscription_id) {
      try {
        console.log(`[Asaas Checkout] Cancelando assinatura anterior: ${user.asaas_subscription_id}`);
        await AsaasSubscriptionService.cancel(user.asaas_subscription_id);
        console.log(`[Asaas Checkout] ✅ Assinatura anterior cancelada`);
      } catch (cancelError: any) {
        // Se a assinatura já estava cancelada/inativa, seguir normalmente
        console.warn(`[Asaas Checkout] ⚠️ Erro ao cancelar assinatura anterior (pode já estar inativa): ${cancelError.message}`);
      }
    }

    // 10. Criar nova assinatura baseado no método de pagamento
    const externalReference = `${user.id}_${plan}_${cycle}`;
    const asaasCycle = BILLING_CYCLE_MAP[cycle] || 'MONTHLY';

    let result: any;

    switch (paymentMethod) {
      // ==========================================
      // PIX
      // ==========================================
      case 'pix': {
        // Criar assinatura recorrente com PIX (mesmo padrão do Boleto)
        const pixSubscription = await AsaasSubscriptionService.createWithPix({
          customerId: asaasCustomer.id,
          plan,
          cycle,
          externalReference,
        });

        // Buscar primeira cobrança gerada pela assinatura
        const pixPayments = await AsaasSubscriptionService.getPayments(pixSubscription.id);
        const firstPixPayment = pixPayments.data[0];

        if (!firstPixPayment) {
          console.error('[Asaas Checkout] ❌ Nenhuma cobrança gerada para assinatura PIX:', pixSubscription.id);
          return NextResponse.json({
            error: 'Erro ao gerar cobrança PIX. Tente novamente.',
          }, { status: 500 });
        }

        // Buscar QR Code PIX da primeira cobrança
        const pixQrCode = await AsaasPaymentService.getPixQrCode(firstPixPayment.id);

        // Salvar assinatura no banco
        await AsaasSubscriptionService.saveToDatabase({
          userId: user.id,
          customerId: dbCustomer.id,
          subscription: pixSubscription,
          plan,
        });

        // Atualizar usuário com info pendente
        await supabaseAdmin.from('users').update({
          asaas_customer_id: asaasCustomer.id,
          asaas_subscription_id: pixSubscription.id,
          plan,
          subscription_status: 'pending',
          subscription_expires_at: pixSubscription.nextDueDate,
        }).eq('id', user.id);

        result = {
          success: true,
          method: 'pix',
          subscriptionId: pixSubscription.id,
          paymentId: firstPixPayment.id,
          pixQrCode: {
            encodedImage: pixQrCode.encodedImage,
            payload: pixQrCode.payload,
            expirationDate: pixQrCode.expirationDate,
          },
          value,
          message: 'QR Code PIX gerado com sucesso',
        };
        break;
      }

      // ==========================================
      // BOLETO
      // ==========================================
      case 'boleto': {
        // Criar assinatura com boleto (recorrente)
        const subscription = await AsaasSubscriptionService.createWithBoleto({
          customerId: asaasCustomer.id,
          plan,
          cycle,
          externalReference,
        });

        // Buscar primeira cobrança (boleto)
        const payments = await AsaasSubscriptionService.getPayments(subscription.id);
        const firstPayment = payments.data[0];

        // Salvar assinatura
        await AsaasSubscriptionService.saveToDatabase({
          userId: user.id,
          customerId: dbCustomer.id,
          subscription,
          plan,
        });

        // Atualizar usuário
        await supabaseAdmin.from('users').update({
          asaas_customer_id: asaasCustomer.id,
          asaas_subscription_id: subscription.id,
          plan,
          subscription_status: 'pending',
          subscription_expires_at: subscription.nextDueDate,
        }).eq('id', user.id);

        result = {
          success: true,
          method: 'boleto',
          subscriptionId: subscription.id,
          paymentId: firstPayment?.id,
          boletoUrl: firstPayment?.bankSlipUrl || firstPayment?.invoiceUrl,
          invoiceUrl: firstPayment?.invoiceUrl,
          dueDate: firstPayment?.dueDate,
          value,
          message: 'Boleto gerado com sucesso',
        };
        break;
      }

      // ==========================================
      // CARTÃO DE CRÉDITO
      // ==========================================
      case 'credit_card': {
        if (!creditCard || !creditCardHolderInfo) {
          return NextResponse.json({
            error: 'Dados do cartão obrigatórios',
          }, { status: 400 });
        }

        // Criar assinatura com cartão
        const subscription = await AsaasSubscriptionService.createWithCreditCard({
          customerId: asaasCustomer.id,
          plan,
          cycle,
          creditCard,
          creditCardHolderInfo,
          externalReference,
        });

        // Salvar assinatura
        await AsaasSubscriptionService.saveToDatabase({
          userId: user.id,
          customerId: dbCustomer.id,
          subscription,
          plan,
        });

        // Buscar primeira cobrança
        const payments = await AsaasSubscriptionService.getPayments(subscription.id);
        const firstPayment = payments.data[0];

        // Se cartão foi aceito, ativar usuário
        if (subscription.status === 'ACTIVE' || firstPayment?.status === 'CONFIRMED') {
          await supabaseAdmin.from('users').update({
            asaas_customer_id: asaasCustomer.id,
            asaas_subscription_id: subscription.id,
            plan,
            is_paid: true,
            subscription_status: 'active',
            subscription_expires_at: subscription.nextDueDate,
            tools_unlocked: plan === 'pro' || plan === 'studio' || plan === 'enterprise',
          }).eq('id', user.id);
        } else {
          // Aguardando confirmação
          await supabaseAdmin.from('users').update({
            asaas_customer_id: asaasCustomer.id,
            asaas_subscription_id: subscription.id,
            plan,
            subscription_status: 'pending',
          }).eq('id', user.id);
        }

        result = {
          success: true,
          method: 'credit_card',
          subscriptionId: subscription.id,
          status: subscription.status,
          creditCardBrand: subscription.creditCard?.creditCardBrand,
          creditCardLastDigits: subscription.creditCard?.creditCardNumber,
          value,
          nextDueDate: subscription.nextDueDate,
          message: subscription.status === 'ACTIVE'
            ? 'Assinatura ativada com sucesso!'
            : 'Processando pagamento...',
        };
        break;
      }

      default:
        return NextResponse.json({
          error: 'Método de pagamento inválido',
        }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[Asaas Checkout] Erro:', error);

    // Erro específico do Asaas
    if (error.name === 'AsaasApiError') {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error.message || 'Erro ao processar checkout',
    }, { status: 500 });
  }
}

/**
 * GET - Verificar status de um pagamento
 * Requer autenticação - usuário só pode ver seus próprios pagamentos
 */
export async function GET(req: Request) {
  try {
    // Autenticação obrigatória
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId obrigatório' }, { status: 400 });
    }

    // Buscar usuário para validar ownership
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, asaas_customer_id')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const payment = await AsaasPaymentService.getById(paymentId);

    if (!payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // Verificar se o pagamento pertence ao usuário
    // Buscar customer do banco para validar
    const { data: dbCustomer } = await supabaseAdmin
      .from('customers')
      .select('asaas_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!dbCustomer || payment.customer !== dbCustomer.asaas_customer_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Se for PIX, buscar QR Code
    let pixQrCode = null;
    if (payment.billingType === 'PIX' && payment.status === 'PENDING') {
      try {
        pixQrCode = await AsaasPaymentService.getPixQrCode(paymentId);
      } catch (e) {
        // QR Code pode não estar disponível
      }
    }

    return NextResponse.json({
      id: payment.id,
      status: payment.status,
      value: payment.value,
      billingType: payment.billingType,
      dueDate: payment.dueDate,
      paymentDate: payment.paymentDate,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      pixQrCode,
      isPaid: ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(payment.status),
    });

  } catch (error: any) {
    console.error('[Asaas Checkout] Erro ao verificar pagamento:', error);
    return NextResponse.json({
      error: error.message || 'Erro ao verificar pagamento',
    }, { status: 500 });
  }
}
