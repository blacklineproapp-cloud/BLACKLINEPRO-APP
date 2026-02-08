import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCourtesyPaymentEmail } from '@/lib/email';
import { logAdminAction } from '@/lib/admin-audit';

export async function POST(req: Request) {
  try {
    // 1. 🔒 VERIFICAR ADMIN
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { dryRun = false, forceResend = false } = body;

    // 2. 🔍 BUSCAR USUÁRIOS DE CORTESIA
    // Buscamos usuários que têm admin_courtesy = true e NÃO têm assinatrua ativa no Asaas
    const { data: courtesyUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, plan, admin_courtesy, asaas_subscription_id, subscription_id')
      .eq('admin_courtesy', true)
      .is('asaas_subscription_id', null);

    if (usersError) {
      console.error('[Send Courtesy Links] Erro ao buscar usuários:', usersError);
      throw usersError;
    }

    // Filtrar quem ainda tem assinatura no Stripe (não deveriam ser cortesia mas por segurança)
    const usersToNotify = (courtesyUsers || []).filter(u => !u.subscription_id);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        count: usersToNotify.length,
        users: usersToNotify.map(u => ({ email: u.email, plan: u.plan })),
        dryRun: true
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stencilflow.com.br';

    // 3. 📧 ENVIAR EMAILS
    // Nota: Em um cenário real com muitos usuários, isso deveria ser feito via fila (Queue/Edge Function background)
    // Para o volume atual, processamos direto.
    for (const user of usersToNotify) {
      try {
        // O checkout do plano no Asaas é processado pelo AsaasCheckoutModal na URL /checkout
        const checkoutUrl = `${appUrl}/checkout?plan=${user.plan || 'pro'}`;
        
        const emailResult = await sendCourtesyPaymentEmail(
          user.email,
          user.name || 'Tatuador',
          user.plan || 'pro',
          checkoutUrl
        );

        if (emailResult.success) {
          results.success++;
        } else {
          throw new Error(emailResult.error);
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${user.email}: ${err.message}`);
      }
    }

    // 4. 📝 REGISTRAR NO AUDIT LOG
    await logAdminAction({
      adminId: userId,
      action: 'send_courtesy_links',
      metadata: {
        total_target: usersToNotify.length,
        success_count: results.success,
        failed_count: results.failed,
        force_resend: forceResend,
        errors: results.errors.slice(0, 10) // Limitar logs de erro
      }
    });

    return NextResponse.json({
      success: true,
      message: `Links enviados: ${results.success} sucesso, ${results.failed} falha.`,
      results
    });

  } catch (error: any) {
    console.error('[Send Courtesy Links] Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro ao processar envio de links: ' + error.message },
      { status: 500 }
    );
  }
}

export const maxDuration = 60; // Aumentar timeout para processamento em lote
