/**
 * Sentry Edge Configuration
 * Monitora erros no Edge Runtime (middleware, edge functions)
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ambiente
  environment: process.env.NODE_ENV || 'development',

  // Performance Monitoring (menor rate no edge devido ao volume)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0, // 5% em prod

  // Ignorar erros comuns no edge
  ignoreErrors: [
    'fetch failed',
    'NetworkError',
  ],

  // Filtrar eventos sensíveis
  beforeSend(event) {
    // Remover dados sensíveis
    if (event.request) {
      delete event.request.cookies;

      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
    }

    return event;
  },
});
