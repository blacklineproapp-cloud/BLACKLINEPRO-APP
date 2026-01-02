/**
 * Sistema de Logging Seguro
 *
 * Em desenvolvimento: loga tudo no console
 * Em produção: sanitiza dados sensíveis e envia para Sentry
 *
 * USO:
 * import { logger } from '@/lib/logger';
 *
 * logger.info('[API] Processando pagamento', { userId, amount });
 * logger.warn('[Webhook] Evento duplicado', { eventId });
 * logger.error('[Database] Erro ao salvar', error);
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

/**
 * Lista de campos sensíveis que devem ser mascarados em produção
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'api_key',
  'authorization',
  'cookie',
  'session',
  'clerk_id',
  'email',
  'phone',
  'cpf',
  'credit_card',
  'card_number',
  'cvv',
  'stripe_customer_id',
  'stripe_payment_id',
];

/**
 * Mascara dados sensíveis recursivamente
 */
function sanitizeData(data: any, depth = 0): any {
  // Prevenir loops infinitos
  if (depth > 10) return '[MAX_DEPTH]';

  if (data === null || data === undefined) return data;

  // Se é string, verificar se parece com email/token
  if (typeof data === 'string') {
    // Mascarar emails (manter 2 primeiros caracteres + domínio)
    if (data.includes('@')) {
      const [local, domain] = data.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }

    // Mascarar tokens (mostrar apenas primeiros/últimos 4 chars)
    if (data.length > 20 && (data.startsWith('sk_') || data.startsWith('pk_') || data.startsWith('user_'))) {
      return `${data.substring(0, 8)}...${data.substring(data.length - 4)}`;
    }

    return data;
  }

  // Se é array
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, depth + 1));
  }

  // Se é objeto
  if (typeof data === 'object') {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();

      // Verificar se campo é sensível
      const isSensitive = SENSITIVE_FIELDS.some(field =>
        keyLower.includes(field.toLowerCase())
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value, depth + 1);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Determina se estamos em ambiente de produção
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Logger principal
 */
class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Log informativo
   */
  info(message: string, context?: LogContext) {
    if (isProduction()) {
      // Em produção: sanitizar e enviar para Sentry como breadcrumb
      const sanitized = context ? sanitizeData(context) : {};
      Sentry.addBreadcrumb({
        message,
        level: 'info',
        data: sanitized,
      });
    } else {
      // Em dev: log completo no console
      console.log(this.formatMessage('info', message, context));
    }
  }

  /**
   * Log de aviso
   */
  warn(message: string, context?: LogContext) {
    if (isProduction()) {
      const sanitized = context ? sanitizeData(context) : {};
      Sentry.addBreadcrumb({
        message,
        level: 'warning',
        data: sanitized,
      });

      // Warnings também vão para console em prod (para CloudWatch/Vercel logs)
      console.warn(`⚠️ ${message}`);
    } else {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  /**
   * Log de erro - SEMPRE envia para Sentry em produção
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    if (isProduction()) {
      const sanitized = context ? sanitizeData(context) : {};

      // Enviar erro completo para Sentry
      Sentry.captureException(errorObj, {
        extra: {
          message,
          ...sanitized,
        },
      });

      // Log resumido no console (sem stack trace sensível)
      console.error(`❌ ${message}: ${errorObj.message}`);
    } else {
      console.error(this.formatMessage('error', message, context));
      if (error instanceof Error) {
        console.error(error.stack);
      }
    }
  }

  /**
   * Log de debug - APENAS em desenvolvimento
   */
  debug(message: string, context?: LogContext) {
    if (!isProduction()) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Log de sucesso com emoji
   */
  success(message: string, context?: LogContext) {
    this.info(`✅ ${message}`, context);
  }
}

/**
 * Instância singleton do logger
 */
export const logger = new Logger();

/**
 * Helper para logging de webhooks (alta frequência)
 */
export const webhookLogger = {
  received: (eventType: string, eventId: string) => {
    logger.info(`[Webhook] Recebido: ${eventType}`, { eventId });
  },

  processed: (eventType: string, eventId: string, duration?: number) => {
    logger.success(`[Webhook] Processado: ${eventType}`, { eventId, duration });
  },

  failed: (eventType: string, eventId: string, error: Error) => {
    logger.error(`[Webhook] Falha: ${eventType}`, error, { eventId });
  },

  duplicate: (eventType: string, eventId: string) => {
    logger.warn(`[Webhook] Duplicado: ${eventType}`, { eventId });
  },
};

/**
 * Helper para logging de autenticação
 */
export const authLogger = {
  login: (userId: string) => {
    logger.info('[Auth] Login realizado', { userId });
  },

  logout: (userId: string) => {
    logger.info('[Auth] Logout realizado', { userId });
  },

  denied: (userId: string, resource: string) => {
    logger.warn('[Auth] Acesso negado', { userId, resource });
  },

  adminAccess: (userId: string, action: string) => {
    logger.info('[Auth] Ação admin', { userId, action });
  },
};

/**
 * Helper para logging de pagamentos
 */
export const paymentLogger = {
  created: (paymentId: string, amount: number, plan: string) => {
    logger.info('[Payment] Pagamento criado', { paymentId, amount, plan });
  },

  succeeded: (paymentId: string, amount: number) => {
    logger.success('[Payment] Pagamento confirmado', { paymentId, amount });
  },

  failed: (paymentId: string, error: string) => {
    logger.error('[Payment] Pagamento falhou', new Error(error), { paymentId });
  },
};
