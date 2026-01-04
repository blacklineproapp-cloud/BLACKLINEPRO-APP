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

    // 4. Buscar usuários de cortesia que ainda não receberam o link
    // Critério: is_paid=true mas não têm subscription_id (= não estão no Stripe)
    let query = supabaseAdmin
      .from('users')
      .select('id, clerk_id, email, name, plan')
      .eq('is_paid', true)
      .is('subscription_id', null)
      .not('plan', 'eq', 'free');

    // Se testEmail foi fornecido, filtrar apenas esse email
    if (testEmail) {
      query = query.eq('email', testEmail);
      console.log(`[Send Courtesy Links] 🧪 MODO TESTE: Enviando apenas para ${testEmail}`);
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: courtesyUsers } = await query;

    if (!courtesyUsers || courtesyUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum usuário de cortesia encontrado',
        sent: 0,
        users: []
      });
    }

    console.log(`[Send Courtesy Links] ${courtesyUsers.length} usuários de cortesia encontrados`);

    // 5. Filtrar usuários que já receberam email de cortesia
    const { data: alreadySent } = await supabaseAdmin
      .from('remarketing_campaigns')
      .select('user_id')
      .eq('campaign_type', 'courtesy');

    const alreadySentIds = new Set(alreadySent?.map(c => c.user_id) || []);

    const usersToSend = courtesyUsers.filter(u => !alreadySentIds.has(u.id));

    // Aplicar limite se especificado
    const finalUsers = limit ? usersToSend.slice(0, limit) : usersToSend;

    console.log(`[Send Courtesy Links] ${finalUsers.length} usuários para enviar (${usersToSend.length - finalUsers.length} já receberam)`);

    if (finalUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos os usuários de cortesia já receberam o link',
        sent: 0,
        alreadySent: alreadySent?.length || 0
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
        await supabaseAdmin
          .from('remarketing_campaigns')
          .insert({
            user_id: user.id,
            campaign_type: 'courtesy',
            email_status: 'sent',
            sent_at: new Date().toISOString()
          });

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
