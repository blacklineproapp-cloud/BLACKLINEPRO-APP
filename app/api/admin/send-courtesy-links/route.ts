import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getPriceIdFromPlan } from '@/lib/billing/stripe-plan-mapping';
import { CheckoutService } from '@/lib/stripe/checkout-service';
import { sendCourtesyPaymentEmail } from '@/lib/email';

/**
 * Envia links de pagamento Stripe para usuários de cortesia
 * POST /api/admin/send-courtesy-links
 *
 * Body:
 * - dryRun?: boolean (default: false) - Se true, não envia emails, apenas retorna preview
 * - limit?: number - Limitar quantidade de envios (útil para testes)
 */
export async function POST(req: Request) {
  try {
    // 1. Verificar autenticação e permissão admin
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(userId);

    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { dryRun = false, limit, testEmail } = body;

    console.log('[Send Courtesy Links] Iniciando envio...', { dryRun, limit, testEmail });

    // 3. Buscar admin user para metadata
    const { data: adminUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('clerk_id', userId)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: 'Admin não encontrado' }, { status: 404 });
    }

    // 4. Buscar usuários de cortesia ou em grace period que precisam migrar para o Stripe
    // Critério: is_paid=true E (admin_courtesy=true OU grace_period_until não é nulo)
    // E, se tiverem subscription_id, que não tenham sido confirmados como pagantes reais no Stripe
    let query = supabaseAdmin
      .from('users')
      .select('id, clerk_id, email, name, plan, admin_courtesy, grace_period_until, subscription_id')
      .eq('is_paid', true)
      .not('plan', 'eq', 'free');

    // Se NÃO for forceResend, podemos ser mais restritivos
    // Mas se FOR forceResend, queremos encontrar todos que o Admin vê como "Cortesia" no painel

    // Se testEmail foi fornecido, filtrar apenas esse email
    if (testEmail) {
      query = query.eq('email', testEmail);
      console.log(`[Send Courtesy Links] 🧪 MODO TESTE: Enviando apenas para ${testEmail}`);
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: allPaidButNoSub, error: queryError } = await query;

    if (queryError) {
      console.error('[Send Courtesy Links] Erro na query:', queryError);
      throw queryError;
    }

    // Filtragem refinada: 
    // Só enviar para quem é admin_courtesy=true OU tem grace_period_until
    // E que NÃO tenham uma assinatura ativa/paga (subscription_id nulo ou admin_courtesy ainda true)
    let courtesyUsers = allPaidButNoSub?.filter(u => {
      // Se admin_courtesy ainda é true, é o alvo principal (não pagou Stripe ainda)
      if (u.admin_courtesy === true) return true;
      
      // Se tem grace_period e não tem sub, também é alvo
      if (u.grace_period_until && !u.subscription_id) return true;

      // Fallback: se is_paid mas não tem sub (migração manual sem flag)
      if (!u.subscription_id) return true;

      return false;
    }) || [];

    console.log(`[Send Courtesy Links] ${courtesyUsers.length} usuários elegíveis para link de pagamento`);

    // 5. Filtrar usuários que já receberam email de cortesia
    let finalUsers = courtesyUsers;
    let alreadySentIds = new Set<string>();

    if (!body.forceResend) {
      const { data: alreadySent } = await supabaseAdmin
        .from('remarketing_campaigns')
        .select('user_id')
        .eq('campaign_type', 'courtesy');

      alreadySentIds = new Set(alreadySent?.map(c => c.user_id) || []);
      finalUsers = courtesyUsers.filter(u => !alreadySentIds.has(u.id));
      console.log(`[Send Courtesy Links] ${finalUsers.length} usuários para enviar (${courtesyUsers.length - finalUsers.length} já receberam)`);
    } else {
      console.log(`[Send Courtesy Links] 🚀 MODO FORCE: Enviando para todos ${courtesyUsers.length} usuários`);
    }

    // Aplicar limite se especificado
    if (limit) {
      finalUsers = finalUsers.slice(0, limit);
    }

    if (finalUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos os usuários de cortesia já receberam o link',
        sent: 0,
        alreadySentCount: alreadySentIds.size
      });
    }

    // 6. DRY RUN - Retornar preview sem enviar
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        message: `Preview: ${finalUsers.length} emails seriam enviados`,
        users: finalUsers.map(u => ({
          email: u.email,
          name: u.name,
          plan: u.plan
        }))
      });
    }

    // 7. ENVIAR EMAILS
    const results = {
      success: [] as any[],
      failed: [] as any[]
    };

    for (const user of finalUsers) {
      try {
        // Validar plano
        if (!['starter', 'pro', 'studio'].includes(user.plan)) {
          console.warn(`[Send Courtesy Links] Plano inválido para ${user.email}: ${user.plan}`);
          results.failed.push({
            email: user.email,
            error: `Plano inválido: ${user.plan}`
          });
          continue;
        }

        // Obter Price ID do Stripe
        const priceId = getPriceIdFromPlan(
          user.plan as 'starter' | 'pro' | 'studio',
          'monthly' // Sempre mensal para links de cortesia
        );

        // Criar checkout session no Stripe
        const checkout = await CheckoutService.createAdminCheckoutSession({
          userEmail: user.email,
          userName: user.name || user.email,
          priceId,
          planType: user.plan as 'starter' | 'pro' | 'studio',
          adminId: adminUser.id,
          clerkId: user.clerk_id
        });

        if (!checkout.url) {
          throw new Error('Stripe não retornou URL do checkout');
        }

        // Enviar email
        const emailResult = await sendCourtesyPaymentEmail(
          user.email,
          user.name || user.email,
          user.plan,
          checkout.url
        );

        if (!emailResult.success) {
          throw new Error(emailResult.error || 'Falha ao enviar email');
        }

        // Registrar envio no banco
        // Registrar envio no banco (usar upsert para evitar erro de duplicata se houver constraint)
        const { error: logError } = await supabaseAdmin
          .from('remarketing_campaigns')
          .upsert({
            user_id: user.id,
            campaign_type: 'courtesy',
            email_status: 'sent',
            sent_at: new Date().toISOString()
          }, { 
            onConflict: 'user_id,campaign_type' 
          });

        if (logError) {
          console.warn(`[Send Courtesy Links] Erro ao registrar log para ${user.email}:`, logError.message);
        }

        console.log(`[Send Courtesy Links] ✅ Enviado para ${user.email}`);

        results.success.push({
          email: user.email,
          name: user.name,
          plan: user.plan,
          checkoutUrl: checkout.url
        });

      } catch (error: any) {
        console.error(`[Send Courtesy Links] ❌ Erro ao enviar para ${user.email}:`, error.message);

        // Registrar falha no banco
        await supabaseAdmin
          .from('remarketing_campaigns')
          .insert({
            user_id: user.id,
            campaign_type: 'courtesy',
            email_status: 'failed',
            error_message: error.message,
            sent_at: new Date().toISOString()
          });

        results.failed.push({
          email: user.email,
          error: error.message
        });
      }
    }

    // 8. Retornar resultado
    return NextResponse.json({
      success: true,
      message: `Envio concluído: ${results.success.length} sucesso, ${results.failed.length} falhas`,
      sent: results.success.length,
      failed: results.failed.length,
      total: finalUsers.length,
      details: {
        success: results.success,
        failed: results.failed
      }
    });

  } catch (error: any) {
    console.error('[Send Courtesy Links] Erro geral:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar links: ' + error.message },
      { status: 500 }
    );
  }
}

// Timeout de 5 minutos para processar todos os envios
export const maxDuration = 300;
