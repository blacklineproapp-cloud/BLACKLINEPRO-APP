/**
 * Configuração Asaas
 *
 * Em PRODUÇÃO: usa variáveis de ambiente (Vercel/Railway)
 * Em DESENVOLVIMENTO: usa config.local.ts (gitignored)
 */

import { logger } from '../logger';

const isDev = process.env.NODE_ENV === 'development';

// Tentar carregar config local (apenas em desenvolvimento)
let localConfig: { apiKey?: string; webhookToken?: string } = {};

if (isDev) {
  try {
     
    const local = require('./config.local');
    localConfig = local.LOCAL_ASAAS_CONFIG || {};
    if (localConfig.apiKey) {
      logger.info('[Asaas] Usando config.local.ts para desenvolvimento');
    }
  } catch {
    logger.warn('[Asaas] config.local.ts não encontrado. Crie a partir do config.local.example.ts');
  }
}

// API Key - Env var tem prioridade, fallback para config local em dev
const apiKey = process.env.ASAAS_API_KEY || localConfig.apiKey || '';

if (!apiKey) {
  if (isDev) {
    logger.error('[Asaas] ASAAS_API_KEY não configurada. Crie lib/asaas/config.local.ts');
  } else {
    logger.error('[Asaas] ASAAS_API_KEY não configurada em produção!');
  }
}

// Webhook Token - Env var tem prioridade, fallback para config local em dev
const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN || localConfig.webhookToken || '';

if (!webhookToken && !isDev) {
  logger.error('[Asaas] ASAAS_WEBHOOK_TOKEN não configurado em produção!');
}

// Determinar ambiente
const environment = process.env.ASAAS_ENVIRONMENT as 'sandbox' | 'production' || 'production';

export const ASAAS_CONFIG = {
  apiKey,
  environment,
  webhookToken,
};

// Log de configuração (sem expor valores)
if (isDev) {
  logger.debug('[Asaas] Config', {
    hasApiKey: !!ASAAS_CONFIG.apiKey,
    source: process.env.ASAAS_API_KEY ? 'env' : (localConfig.apiKey ? 'local' : 'none'),
    environment: ASAAS_CONFIG.environment,
    hasWebhookToken: !!ASAAS_CONFIG.webhookToken,
  });

  // Log temporário para debug local: mostra apenas comprimento e prefix/sufixo mascarados
  try {
    const key = process.env.ASAAS_API_KEY || ASAAS_CONFIG.apiKey || '';
    if (key) {
      const len = key.length;
      const prefix = key.slice(0, 6);
      const suffix = key.slice(-6);
      logger.debug('[Asaas] DEBUG key', { length: len, preview: `${prefix}...${suffix}` });
    } else {
      logger.debug('[Asaas] DEBUG key: not set');
    }
  } catch (e) {
    logger.warn('[Asaas] DEBUG key: error reading key', e instanceof Error ? { error: e.message } : {});
  }
}
