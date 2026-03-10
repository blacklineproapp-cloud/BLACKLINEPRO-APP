/**
 * Sentry Service - Integração com API do Sentry
 * Busca issues e eventos para exibição no painel admin
 * 
 * Documentação oficial:
 * - Issues: https://docs.sentry.io/api/events/list-a-projects-issues/
 * - Events: https://docs.sentry.io/api/events/retrieve-an-event-for-a-project/
 */

import { logger } from './logger';

// Tipos para a API do Sentry
export interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  level: 'error' | 'warning' | 'info' | 'fatal';
  status: 'unresolved' | 'resolved' | 'ignored';
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  metadata: {
    type?: string;
    value?: string;
    filename?: string;
    function?: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface SentryEvent {
  id: string;
  eventID: string;
  title: string;
  message: string;
  dateCreated: string;
  user?: {
    id?: string;
    email?: string;
    username?: string;
    ip_address?: string;
  };
  tags: Array<{ key: string; value: string }>;
  context?: Record<string, any>;
  entries?: Array<{
    type: string;
    data: any;
  }>;
}

// Configuração do Sentry
const SENTRY_API_BASE = 'https://sentry.io/api/0';

/**
 * Headers de autenticação para API do Sentry
 */
function getSentryHeaders(): HeadersInit {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) {
    throw new Error('SENTRY_AUTH_TOKEN não configurado');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Busca issues recentes do Sentry
 * @param limit Número máximo de issues (padrão: 25)
 * @param query Filtro de busca (ex: "is:unresolved")
 */
export async function fetchSentryIssues(
  limit: number = 25,
  query: string = 'is:unresolved'
): Promise<SentryIssue[]> {
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;

  if (!org || !project) {
    throw new Error('SENTRY_ORG ou SENTRY_PROJECT não configurados');
  }

  try {
    const url = `${SENTRY_API_BASE}/projects/${org}/${project}/issues/?query=${encodeURIComponent(query)}&limit=${limit}`;
    
    const response = await fetch(url, {
      headers: getSentryHeaders(),
      next: { revalidate: 60 }, // Cache de 1 minuto
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Sentry Service] Erro na API', new Error(errorText), { status: response.status });
      throw new Error(`Sentry API retornou ${response.status}`);
    }

    const issues: SentryIssue[] = await response.json();
    return issues;
  } catch (error: any) {
    logger.error('[Sentry Service] Erro ao buscar issues', error);
    throw error;
  }
}

/**
 * Busca detalhes de uma issue específica
 * @param issueId ID da issue
 */
export async function fetchSentryIssueDetails(issueId: string): Promise<SentryIssue> {
  const org = process.env.SENTRY_ORG;

  if (!org) {
    throw new Error('SENTRY_ORG não configurado');
  }

  try {
    const url = `${SENTRY_API_BASE}/organizations/${org}/issues/${issueId}/`;
    
    const response = await fetch(url, {
      headers: getSentryHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Sentry API retornou ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    logger.error('[Sentry Service] Erro ao buscar detalhes da issue', error);
    throw error;
  }
}

/**
 * Busca eventos de uma issue
 * @param issueId ID da issue
 * @param limit Número máximo de eventos
 */
export async function fetchIssueEvents(
  issueId: string,
  limit: number = 10
): Promise<SentryEvent[]> {
  const org = process.env.SENTRY_ORG;

  if (!org) {
    throw new Error('SENTRY_ORG não configurado');
  }

  try {
    const url = `${SENTRY_API_BASE}/organizations/${org}/issues/${issueId}/events/?limit=${limit}`;
    
    const response = await fetch(url, {
      headers: getSentryHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Sentry API retornou ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    logger.error('[Sentry Service] Erro ao buscar eventos', error);
    throw error;
  }
}

/**
 * Marca uma issue como resolvida
 * @param issueId ID da issue
 */
export async function resolveIssue(issueId: string): Promise<boolean> {
  const org = process.env.SENTRY_ORG;

  if (!org) {
    throw new Error('SENTRY_ORG não configurado');
  }

  try {
    const url = `${SENTRY_API_BASE}/organizations/${org}/issues/${issueId}/`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: getSentryHeaders(),
      body: JSON.stringify({ status: 'resolved' }),
    });

    return response.ok;
  } catch (error: any) {
    logger.error('[Sentry Service] Erro ao resolver issue', error);
    return false;
  }
}

/**
 * Busca estatísticas gerais do projeto
 */
export async function fetchProjectStats(): Promise<{
  issueCount: number;
  errorCount24h: number;
  warningCount24h: number;
}> {
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;

  if (!org || !project) {
    throw new Error('SENTRY_ORG ou SENTRY_PROJECT não configurados');
  }

  try {
    // Buscar issues não resolvidas
    const unresolvedUrl = `${SENTRY_API_BASE}/projects/${org}/${project}/issues/?query=is:unresolved&limit=100`;
    const unresolvedRes = await fetch(unresolvedUrl, {
      headers: getSentryHeaders(),
      next: { revalidate: 60 },
    });

    if (!unresolvedRes.ok) {
      throw new Error('Falha ao buscar issues não resolvidas');
    }

    const unresolvedIssues: SentryIssue[] = await unresolvedRes.json();

    // Filtrar issues das últimas 24h
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recent = unresolvedIssues.filter(issue => 
      new Date(issue.lastSeen) > yesterday
    );

    const errors = recent.filter(i => i.level === 'error' || i.level === 'fatal').length;
    const warnings = recent.filter(i => i.level === 'warning').length;

    return {
      issueCount: unresolvedIssues.length,
      errorCount24h: errors,
      warningCount24h: warnings,
    };
  } catch (error: any) {
    logger.error('[Sentry Service] Erro ao buscar estatísticas', error);
    return {
      issueCount: 0,
      errorCount24h: 0,
      warningCount24h: 0,
    };
  }
}

/**
 * Verifica se a configuração do Sentry está completa
 */
export function isSentryConfigured(): boolean {
  return !!(
    process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT
  );
}
