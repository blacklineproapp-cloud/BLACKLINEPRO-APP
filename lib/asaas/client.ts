/**
 * Asaas API Client
 *
 * Cliente HTTP configurado para API do Asaas
 * Suporta ambiente sandbox e produção
 */

import type { AsaasError } from './types';
import { ASAAS_CONFIG } from './config';
import { logger } from '../logger';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const ASAAS_ENVIRONMENTS = {
  sandbox: 'https://sandbox.asaas.com/api/v3',
  production: 'https://api.asaas.com/v3',
} as const;

function getBaseUrl(): string {
  const env = process.env.ASAAS_ENVIRONMENT || ASAAS_CONFIG.environment || 'sandbox';
  return ASAAS_ENVIRONMENTS[env as keyof typeof ASAAS_ENVIRONMENTS] || ASAAS_ENVIRONMENTS.sandbox;
}

function getApiKey(): string {
  // Tentar env var primeiro, depois fallback para config
  const key = process.env.ASAAS_API_KEY || ASAAS_CONFIG.apiKey;

  if (!key) {
    throw new Error('ASAAS_API_KEY não configurada. Verifique as variáveis de ambiente.');
  }

  return key;
}

// ============================================================================
// CLIENTE HTTP
// ============================================================================

export class AsaasApiError extends Error {
  public code: string;
  public errors: Array<{ code: string; description: string }>;
  public statusCode: number;

  constructor(
    message: string,
    code: string,
    errors: Array<{ code: string; description: string }>,
    statusCode: number
  ) {
    super(message);
    this.name = 'AsaasApiError';
    this.code = code;
    this.errors = errors;
    this.statusCode = statusCode;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

/**
 * Faz uma requisição à API do Asaas
 */
export async function asaasRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const apiKey = getApiKey();

  // Construir URL com query params
  let url = `${baseUrl}${endpoint}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Configurar headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'access_token': apiKey,
    'User-Agent': 'Black Line Pro/1.0',
    ...options.headers,
  };

  // Log em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    logger.debug('[Asaas] Request', { method: options.method || 'GET', endpoint });
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse response
    const data = await response.json();

    // Verificar erros
    if (!response.ok) {
      const asaasError = data as AsaasError;
      const errorMessage = asaasError.errors?.[0]?.description || 'Erro na API do Asaas';
      const errorCode = asaasError.errors?.[0]?.code || 'UNKNOWN_ERROR';

      logger.error('[Asaas] Erro na resposta', { statusCode: response.status, asaasError });

      throw new AsaasApiError(
        errorMessage,
        errorCode,
        asaasError.errors || [],
        response.status
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof AsaasApiError) {
      throw error;
    }

    // Erro de rede ou outro
    logger.error('[Asaas] Erro de requisição', error);
    throw new AsaasApiError(
      'Erro de conexão com Asaas',
      'NETWORK_ERROR',
      [{ code: 'NETWORK_ERROR', description: 'Falha na conexão com a API' }],
      0
    );
  }
}

/**
 * GET request
 */
export function asaasGet<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return asaasRequest<T>(endpoint, { method: 'GET', params });
}

/**
 * POST request
 */
export function asaasPost<T>(
  endpoint: string,
  body: Record<string, any>
): Promise<T> {
  return asaasRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 */
export function asaasPut<T>(
  endpoint: string,
  body: Record<string, any>
): Promise<T> {
  return asaasRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 */
export function asaasDelete<T>(endpoint: string): Promise<T> {
  return asaasRequest<T>(endpoint, { method: 'DELETE' });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica se o ambiente é sandbox
 */
export function isSandbox(): boolean {
  return process.env.ASAAS_ENVIRONMENT !== 'production';
}

/**
 * Retorna a URL base atual
 */
export function getAsaasBaseUrl(): string {
  return getBaseUrl();
}

/**
 * Formata data para o padrão Asaas (YYYY-MM-DD)
 */
export function formatAsaasDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calcula a data de vencimento (hoje + dias)
 */
export function getDueDate(daysFromNow: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return formatAsaasDate(date);
}
