import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/api-middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCourtesyPaymentEmail } from '@/lib/email';
import { logAdminAction } from '@/lib/admin-audit';
import { logger } from '@/lib/logger';

export const POST = withAdminAuth(async (req, { userId }) => {
  const body = await req.json();
  const { dryRun = false, forceResend = false } = body;

  // 2. BUSCAR USUARIOS DE CORTESIA
  const { data: courtesyUsers, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, email, name, plan, admin_courtesy, asaas_subscription_id, subscription_id')
    .eq('admin_courtesy', true)
    .is('asaas_subscription_id', null);

  if (usersError) {
    logger.error('[Send Courtesy Links] Erro ao buscar usuários', { error: usersError });
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://Black Line Pro.com.br';

  // 3. ENVIAR EMAILS
  for (const user of usersToNotify) {
    try {
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

  // 4. REGISTRAR NO AUDIT LOG
  await logAdminAction({
    adminId: userId,
    action: 'send_courtesy_links',
    metadata: {
      total_target: usersToNotify.length,
      success_count: results.success,
      failed_count: results.failed,
      force_resend: forceResend,
      errors: results.errors.slice(0, 10)
    }
  });

  return NextResponse.json({
    success: true,
    message: `Links enviados: ${results.success} sucesso, ${results.failed} falha.`,
    results
  });
});

export const maxDuration = 60;
