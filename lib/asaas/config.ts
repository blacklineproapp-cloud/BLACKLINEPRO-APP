/**
 * Configuração Asaas
 *
 * Em PRODUÇÃO: usa variáveis de ambiente (Vercel/Railway)
 * Em DESENVOLVIMENTO: usa config.local.ts (gitignored)
 */

const isDev = process.env.NODE_ENV === 'development';

// Tentar carregar config local (apenas em desenvolvimento)
let localConfig: { apiKey?: string; webhookToken?: string } = {};

if (isDev) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const local = require('./config.local');
    localConfig = local.LOCAL_ASAAS_CONFIG || {};
    if (localConfig.apiKey) {
      console.log('[Asaas] ✅ Usando config.local.ts para desenvolvimento');
    }
  } catch {
    console.warn('[Asaas] ⚠️ config.local.ts não encontrado. Crie a partir do config.local.example.ts');
  }
}

// API Key - Env var tem prioridade, fallback para config local em dev
const apiKey = process.env.ASAAS_API_KEY || localConfig.apiKey || '';

if (!apiKey) {
  if (isDev) {
    console.error('[Asaas] ❌ ASAAS_API_KEY não configurada. Crie lib/asaas/config.local.ts');
  } else {
    console.error('[Asaas] ❌ ASAAS_API_KEY não configurada em produção!');
  }
}

// Webhook Token - Env var tem prioridade, fallback para config local em dev
const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN || localConfig.webhookToken || '';

if (!webhookToken && !isDev) {
  console.error('[Asaas] ❌ ASAAS_WEBHOOK_TOKEN não configurado em produção!');
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
  console.log('[Asaas] Config:', {
    hasApiKey: !!ASAAS_CONFIG.apiKey,
    source: process.env.ASAAS_API_KEY ? 'env' : (localConfig.apiKey ? 'local' : 'none'),
    environment: ASAAS_CONFIG.environment,
    hasWebhookToken: !!ASAAS_CONFIG.webhookToken,
  });
}
