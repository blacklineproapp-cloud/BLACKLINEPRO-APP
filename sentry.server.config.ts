/**
 * Sentry Server Configuration
 * Monitora erros e performance no servidor (API routes, SSR)
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ambiente
  environment: process.env.NODE_ENV || 'development',

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% em prod

  // Integrations
  integrations: [
    Sentry.httpIntegration(),
    Sentry.prismaIntegration(),
  ],

  // Ignorar erros comuns
  ignoreErrors: [
    // Erros de rede/timeout esperados
    'fetch failed',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',

    // Erros de autenticação esperados
    'Unauthenticated',
    'Não autenticado',

    // Erros de rate limiting (esperados)
    'Rate limit exceeded',
    'Too Many Requests',
  ],

  // Filtrar eventos sensíveis
  beforeSend(event) {
    // Remover dados sensíveis de headers e cookies
    if (event.request) {
      delete event.request.cookies;

      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
    }

    // Remover variáveis de ambiente sensíveis
    if (event.contexts?.runtime) {
      delete event.contexts.runtime;
    }

    return event;
  },

  // Debug apenas em desenvolvimento
  debug: process.env.NODE_ENV === 'development',
});
