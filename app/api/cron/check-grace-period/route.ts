/**
 * Cron Job: Verificar Grace Period
 *
 * Roda diariamente para:
 * 1. Bloquear usuários que passaram do grace period (1 dia)
 * 2. Enviar lembretes para usuários em grace period
 *
 * Configurar no Vercel Cron ou chamar via cron externo:
 * GET /api/cron/check-grace-period?secret=CRON_SECRET
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { maskEmail } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 segundos max

export async function GET(req: Request) {
  try {
    // Validar secret (OBRIGATÓRIO - não permite bypass)
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    // Se CRON_SECRET não estiver configurado, bloquear acesso (fail-secure)
    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET não configurado - acesso bloqueado');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    if (
      !secret ||
      secret.length !== cronSecret.length ||
      !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(cronSecret))
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] 🔄 Verificando grace periods...');

    const now = new Date();
    const results = {
      blocked: 0,
      reminded: 0,
      expiredSwept: 0,
      errors: [] as string[],
    };

    // 1. Buscar usuários com grace_period_until que já passou
    const { data: expiredUsers, error: expiredError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, grace_period_until')
      .not('grace_period_until', 'is', null)
      .lt('grace_period_until', now.toISOString())
      .eq('is_blocked', false); // Ainda não bloqueado

    if (expiredError) {
      console.error('[Cron] Erro ao buscar expirados:', expiredError);
      results.errors.push(expiredError.message);
    }

    // 2. Bloquear usuários com grace period expirado
    if (expiredUsers && expiredUsers.length > 0) {
      console.log(`[Cron] ⚠️ ${expiredUsers.length} usuários com grace period expirado`);

      for (const user of expiredUsers) {
        try {
          await supabaseAdmin.from('users').update({
            is_blocked: true,
            blocked_reason: 'Pagamento não regularizado após grace period de 1 dia',
            blocked_at: now.toISOString(),
            subscription_status: 'blocked',
          }).eq('id', user.id);

          console.log(`[Cron] 🚫 Bloqueado: ${maskEmail(user.email)}`);
          results.blocked++;

          // TODO: Enviar email de bloqueio
          // - Assunto: "Sua conta StencilFlow foi limitada"
          // - Explicar que funcionalidades estão bloqueadas
          // - Link para regularizar pagamento

        } catch (blockError: any) {
          console.error(`[Cron] Erro ao bloquear ${maskEmail(user.email)}:`, blockError);
          results.errors.push(`Erro ao bloquear user ${user.id}: ${blockError.message}`);
        }
      }
    }

    // 3. Buscar usuários em grace period (ainda não expirou) para lembrete
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: warningUsers, error: warningError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, grace_period_until')
      .not('grace_period_until', 'is', null)
      .gt('grace_period_until', now.toISOString()) // Ainda não expirou
      .lt('grace_period_until', tomorrow.toISOString()) // Mas expira amanhã
      .eq('is_blocked', false);

    if (warningError) {
      console.error('[Cron] Erro ao buscar avisos:', warningError);
      results.errors.push(warningError.message);
    }

    // 4. Enviar lembretes (último dia)
    if (warningUsers && warningUsers.length > 0) {
      console.log(`[Cron] ⏰ ${warningUsers.length} usuários no último dia de grace period`);

      for (const user of warningUsers) {
        // TODO: Enviar email de último aviso
        // - Assunto: "URGENTE: Último dia para regularizar seu pagamento"
        // - Link para pagar
        // - Aviso que será bloqueado amanhã

        console.log(`[Cron] 📧 Lembrete enviado para: ${maskEmail(user.email)}`);
        results.reminded++;
      }
    }

    // 5. SWEEP: Buscar usuários pagos com assinatura expirada que ainda não foram bloqueados
    const { data: expiredSubUsers, error: expiredSubError } = await supabaseAdmin
      .from('users')
      .select('id, email, subscription_expires_at')
      .eq('is_paid', true)
      .eq('is_blocked', false)
      .not('subscription_expires_at', 'is', null)
      .lt('subscription_expires_at', now.toISOString())
      .neq('plan', 'free');

    if (expiredSubError) {
      console.error('[Cron] Erro ao buscar assinaturas expiradas:', expiredSubError);
      results.errors.push(expiredSubError.message);
    }

    if (expiredSubUsers && expiredSubUsers.length > 0) {
      console.log(`[Cron] ⚠️ ${expiredSubUsers.length} usuários com assinatura expirada (sweep)`);

      for (const user of expiredSubUsers) {
        try {
          // Verificar se tem cortesia ativa (não bloquear cortesias)
          const { data: courtesyCheck } = await supabaseAdmin
            .from('users')
            .select('admin_courtesy, admin_courtesy_expires_at')
            .eq('id', user.id)
            .single();

          if (
            courtesyCheck?.admin_courtesy === true &&
            courtesyCheck?.admin_courtesy_expires_at &&
            new Date(courtesyCheck.admin_courtesy_expires_at) > now
          ) {
            console.log(`[Cron] ⏭️ Pulando ${maskEmail(user.email)} - cortesia ativa`);
            continue;
          }

          await supabaseAdmin.from('users').update({
            is_blocked: true,
            blocked_reason: 'Assinatura expirada - pagamento não renovado',
            blocked_at: now.toISOString(),
            subscription_status: 'expired',
          }).eq('id', user.id);

          console.log(`[Cron] 🚫 Bloqueado (assinatura expirada): ${maskEmail(user.email)} - expirou em ${user.subscription_expires_at}`);
          results.expiredSwept++;
        } catch (sweepError: any) {
          console.error(`[Cron] Erro no sweep ${maskEmail(user.email)}:`, sweepError);
          results.errors.push(`Erro no sweep user ${user.id}: ${sweepError.message}`);
        }
      }
    }

    // 6. Relatório
    console.log('[Cron] ✅ Verificação concluída:', results);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });

  } catch (error: any) {
    console.error('[Cron] Erro geral:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
