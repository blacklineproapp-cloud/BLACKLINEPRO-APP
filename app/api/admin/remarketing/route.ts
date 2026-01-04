import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sendRemarketingEmail } from '@/lib/email';

/**
 * API Route: Admin - Sistema de Remarketing
 *
 * GET: Estatísticas e usuários elegíveis
 * POST: Enviar campanha de remarketing
 */

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // 1. Buscar total de usuários FREE
    const { count: totalFree } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_paid', false);

    // 2. Buscar estatísticas de cada campanha
    const campaigns = ['initial', 'reminder', 'final'] as const;
    const stats: Record<string, any> = {};

    for (const campaignType of campaigns) {
      // Calcular data de corte (1, 7 ou 14 dias)
      const daysRequired = campaignType === 'initial' ? 1 : campaignType === 'reminder' ? 7 : 14;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysRequired);

      // Usuários elegíveis (cadastrados há X dias ou mais)
      const { count: eligible } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_paid', false)
        .lte('created_at', cutoffDate.toISOString());

      // Já receberam esta campanha
      const { count: alreadySent } = await supabaseAdmin
        .from('remarketing_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_type', campaignType);

      // Pendentes
      const pending = (eligible || 0) - (alreadySent || 0);

      stats[campaignType] = {
        eligible: eligible || 0,
        alreadySent: alreadySent || 0,
        pending: Math.max(0, pending),
        daysRequired
      };
    }

    // 3. Últimas campanhas enviadas (histórico)
    const { data: recentCampaigns } = await supabaseAdmin
      .from('remarketing_campaigns')
      .select(`
        id,
        campaign_type,
        email_status,
        created_at,
        users (
          email,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. Taxa de conversão pós-remarketing (usuários que assinaram depois de receber email)
    const { data: conversions } = await supabaseAdmin
      .from('remarketing_campaigns')
      .select(`
        user_id,
        created_at,
        users!inner (
          is_paid,
          subscription_created_at
        )
      `)
      .eq('users.is_paid', true)
      .not('users.subscription_created_at', 'is', null);

    // Contar conversões onde a assinatura veio DEPOIS do email
    let conversionCount = 0;
    if (conversions) {
      conversionCount = conversions.filter(c => {
        const emailDate = new Date(c.created_at);
        const subDate = new Date((c.users as any).subscription_created_at);
        return subDate > emailDate;
      }).length;
    }

    const conversionRate = stats.initial.alreadySent > 0
      ? ((conversionCount / stats.initial.alreadySent) * 100).toFixed(2)
      : '0.00';

    return NextResponse.json({
      totalFreeUsers: totalFree || 0,
      stats,
      recentCampaigns: recentCampaigns || [],
      conversions: {
        total: conversionCount,
        rate: conversionRate
      }
    });

  } catch (error: any) {
    console.error('[Admin Remarketing GET] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Verificar se é admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { campaignType, limit, dryRun } = await req.json();

    // Validar tipo de campanha
    if (!['initial', 'reminder', 'final'].includes(campaignType)) {
      return NextResponse.json(
        { error: 'Tipo de campanha inválido' },
        { status: 400 }
      );
    }

    // Calcular data de corte
    const daysRequired = campaignType === 'initial' ? 1 : campaignType === 'reminder' ? 7 : 14;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysRequired);

    // Buscar usuários FREE elegíveis
    let query = supabaseAdmin
      .from('users')
      .select('id, email, name, created_at')
      .eq('is_paid', false)
      .lte('created_at', cutoffDate.toISOString());

    if (limit && limit > 0) {
      query = query.limit(limit);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum usuário elegível encontrado',
        sent: 0,
        errors: 0
      });
    }

    // Buscar usuários que já receberam esta campanha
    const { data: alreadySent } = await supabaseAdmin
      .from('remarketing_campaigns')
      .select('user_id')
      .eq('campaign_type', campaignType);

    const alreadySentIds = new Set((alreadySent || []).map(r => r.user_id));

    // Filtrar usuários que ainda não receberam
    const eligibleUsers = users.filter(user => !alreadySentIds.has(user.id));

    if (eligibleUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos os usuários elegíveis já receberam esta campanha',
        sent: 0,
        errors: 0
      });
    }

    // Se for dry run, retornar apenas a lista
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        eligibleUsers: eligibleUsers.map(u => ({
          email: u.email,
          name: u.name,
          createdAt: u.created_at
        })),
        totalToSend: eligibleUsers.length
      });
    }

    // ENVIO REAL
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (const user of eligibleUsers) {
      try {
        const result = await sendRemarketingEmail(
          user.email,
          user.name || 'Tatuador',
          campaignType as 'initial' | 'reminder' | 'final'
        );

        if (result && result.success) {
          // Registrar envio bem-sucedido
          await supabaseAdmin
            .from('remarketing_campaigns')
            .insert({
              user_id: user.id,
              campaign_type: campaignType,
              email_status: 'sent'
            });

          successCount++;
        } else {
          // Registrar falha
          await supabaseAdmin
            .from('remarketing_campaigns')
            .insert({
              user_id: user.id,
              campaign_type: campaignType,
              email_status: 'failed',
              error_message: result?.error || 'Erro desconhecido'
            });

          errorCount++;
          errors.push({ email: user.email, error: result?.error || 'Erro desconhecido' });
        }

        // Pequeno delay entre emails (500ms)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        // Registrar erro
        await supabaseAdmin
          .from('remarketing_campaigns')
          .insert({
            user_id: user.id,
            campaign_type: campaignType,
            email_status: 'failed',
            error_message: error.message
          });

        errorCount++;
        errors.push({ email: user.email, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      campaignType,
      sent: successCount,
      errors: errorCount,
      total: eligibleUsers.length,
      errorDetails: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('[Admin Remarketing POST] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar campanha' },
      { status: 500 }
    );
  }
}

export const maxDuration = 300; // 5 minutos para enviar emails
