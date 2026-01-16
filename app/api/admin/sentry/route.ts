/**
 * API: Sentry Integration
 * Endpoint para buscar issues e eventos do Sentry
 * Apenas para admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isAdmin } from '@/lib/auth';
import { 
  fetchSentryIssues, 
  fetchProjectStats, 
  resolveIssue,
  isSentryConfigured 
} from '@/lib/sentry-service';
import { translateError } from '@/lib/error-translator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/sentry
 * Retorna issues do Sentry com tradução para português
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticação
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Verificar se Sentry está configurado
    if (!isSentryConfigured()) {
      return NextResponse.json({
        configured: false,
        message: 'Sentry não configurado. Configure SENTRY_AUTH_TOKEN, SENTRY_ORG e SENTRY_PROJECT.',
        issues: [],
        stats: null,
      });
    }

    // Parâmetros
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '25');
    const query = searchParams.get('query') || 'is:unresolved';

    // Buscar dados em paralelo
    const [issues, stats] = await Promise.all([
      fetchSentryIssues(limit, query),
      fetchProjectStats(),
    ]);

    // Traduzir issues para português
    const translatedIssues = issues.map(issue => {
      const translation = translateError(
        issue.metadata?.type || issue.title,
        issue.metadata?.value
      );

      return {
        id: issue.id,
        shortId: issue.shortId,
        originalTitle: issue.title,
        translation: {
          title: translation.title,
          description: translation.description,
          severity: translation.severity,
          suggestedAction: translation.suggestedAction,
          actionType: translation.actionType,
          category: translation.category,
        },
        level: issue.level,
        status: issue.status,
        count: parseInt(issue.count),
        userCount: issue.userCount,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        metadata: issue.metadata,
        culprit: issue.culprit,
      };
    });

    // Estatísticas resumidas
    const summary = {
      totalUnresolved: stats.issueCount,
      errors24h: stats.errorCount24h,
      warnings24h: stats.warningCount24h,
      criticalCount: translatedIssues.filter(i => i.translation.severity === 'critical').length,
      warningCount: translatedIssues.filter(i => i.translation.severity === 'warning').length,
      infoCount: translatedIssues.filter(i => i.translation.severity === 'info').length,
    };

    return NextResponse.json({
      configured: true,
      issues: translatedIssues,
      stats: summary,
      sentryOrg: process.env.SENTRY_ORG, // Para construir URLs no cliente
      updatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Sentry API] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar dados do Sentry' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sentry
 * Ações em issues (resolver, ignorar, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { action, issueId } = body;

    if (!action || !issueId) {
      return NextResponse.json(
        { error: 'action e issueId são obrigatórios' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'resolve':
        const resolved = await resolveIssue(issueId);
        return NextResponse.json({ 
          success: resolved,
          message: resolved ? 'Issue marcada como resolvida' : 'Erro ao resolver issue'
        });

      default:
        return NextResponse.json(
          { error: `Ação "${action}" não suportada` },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('[Sentry API] Erro na ação:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao executar ação' },
      { status: 500 }
    );
  }
}
