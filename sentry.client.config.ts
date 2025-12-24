/**
 * Sentry Client Configuration
 * Monitora erros e performance no browser
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ambiente
  environment: process.env.NODE_ENV || 'development',

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% em prod, 100% em dev

  // Session Replay (para ver o que o usuário fez antes do erro)
  replaysSessionSampleRate: 0.1, // 10% das sessões normais
  replaysOnErrorSampleRate: 1.0, // 100% das sessões com erro

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Ignorar erros comuns/esperados
  ignoreErrors: [
    // Erros de rede comuns
    'NetworkError',
    'Network request failed',
    'Failed to fetch',

    // Erros de extensões de navegador
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',

    // Erros conhecidos do Clerk/Supabase
    'AbortError',
  ],

  // Filtrar breadcrumbs sensíveis
  beforeBreadcrumb(breadcrumb) {
    // Não logar dados de console em produção
    if (breadcrumb.category === 'console' && process.env.NODE_ENV === 'production') {
      return null;
    }
    return breadcrumb;
  },

  // Filtrar eventos sensíveis
  beforeSend(event) {
    // Remover dados sensíveis
    if (event.request) {
      delete event.request.cookies;
    }
    return event;
  },
});
