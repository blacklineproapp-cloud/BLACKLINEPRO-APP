/**
 * Retry Logic com Backoff Exponencial
 *
 * Implementa retry automático para chamadas de API que podem falhar temporariamente
 * (Gemini, Stripe, Supabase, etc.)
 */

export interface RetryOptions {
  /**
   * Número máximo de tentativas (padrão: 3)
   */
  maxRetries?: number;

  /**
   * Delay inicial em ms (padrão: 1000ms = 1s)
   */
  initialDelay?: number;

  /**
   * Multiplicador do backoff (padrão: 2)
   * Delay será: initialDelay * (backoffMultiplier ^ attempt)
   */
  backoffMultiplier?: number;

  /**
   * Delay máximo em ms (padrão: 10000ms = 10s)
   */
  maxDelay?: number;

  /**
   * Função para determinar se deve fazer retry
   * Retorna true para fazer retry, false para falhar imediatamente
   */
  shouldRetry?: (error: any, attempt: number) => boolean;

  /**
   * Callback chamado antes de cada retry
   */
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

/**
 * Erros que NÃO devem ser retried (client errors)
 */
const NON_RETRYABLE_CODES = [
  400, // Bad Request
  401, // Unauthorized
  403, // Forbidden
  404, // Not Found
  422, // Unprocessable Entity
];

/**
 * Erros que DEVEM ser retried (server/network errors)
 */
const RETRYABLE_CODES = [
  408, // Request Timeout
  429, // Too Many Requests (rate limit)
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
];

/**
 * Função padrão para determinar se deve fazer retry
 */
function defaultShouldRetry(error: any, attempt: number): boolean {
  // Não retry se excedeu tentativas (verificado antes)
  // Verificar se é erro HTTP
  if (error?.status || error?.response?.status) {
    const status = error.status || error.response?.status;

    // Não retry em erros de cliente
    if (NON_RETRYABLE_CODES.includes(status)) {
      return false;
    }

    // Retry em erros de servidor
    if (RETRYABLE_CODES.includes(status)) {
      return true;
    }
  }

  // Retry em erros de rede
  if (
    error?.code === 'ECONNRESET' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ENOTFOUND' ||
    error?.message?.includes('network') ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('ECONNREFUSED')
  ) {
    return true;
  }

  // Por padrão, não retry em erros desconhecidos
  return false;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcula delay com backoff exponencial
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  backoffMultiplier: number,
  maxDelay: number
): number {
  const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Executa função com retry automático
 *
 * @param fn Função assíncrona a ser executada
 * @param options Opções de retry
 * @returns Resultado da função ou erro
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     return response.json();
 *   },
 *   {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     onRetry: (error, attempt, delay) => {
 *       console.log(`Retry ${attempt} após ${delay}ms: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
    maxDelay = 10000,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Se é a última tentativa, lançar erro
      if (attempt > maxRetries) {
        throw error;
      }

      // Verificar se deve fazer retry
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Calcular delay
      const delay = calculateDelay(attempt, initialDelay, backoffMultiplier, maxDelay);

      // Callback de retry
      if (onRetry) {
        onRetry(error, attempt, delay);
      } else {
        console.warn(
          `[Retry] Tentativa ${attempt}/${maxRetries} falhou, retry em ${delay}ms:`,
          (error as any)?.message || error
        );
      }

      // Aguardar antes de retry
      await sleep(delay);
    }
  }

  // Nunca deve chegar aqui, mas TypeScript precisa
  throw lastError;
}

/**
 * Wrapper para requisições fetch com retry
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, options);

    // Lançar erro para status codes de erro (para ativar retry)
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      (error as any).response = response;
      throw error;
    }

    return response;
  }, retryOptions);
}

/**
 * Retry específico para Gemini API
 * - Rate limit: 429 → retry com delay maior
 * - Timeout: 504 → retry
 * - Server error: 500+ → retry
 */
export async function retryGeminiAPI<T>(
  fn: () => Promise<T>,
  operationType: string = 'Gemini API'
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 3,
    initialDelay: 2000, // Gemini pode ser lento, começar com 2s
    backoffMultiplier: 2,
    maxDelay: 15000, // Max 15s de espera
    shouldRetry: (error, attempt) => {
      // Rate limit do Gemini
      if (error?.status === 429 || error?.message?.includes('quota')) {
        return attempt <= 2; // Tentar no máximo 2 vezes em rate limit
      }

      // Timeout
      if (error?.status === 504 || error?.message?.includes('timeout')) {
        return true;
      }

      // Server errors
      if (error?.status >= 500) {
        return true;
      }

      return defaultShouldRetry(error, attempt);
    },
    onRetry: (error, attempt, delay) => {
      console.warn(
        `[${operationType}] Retry ${attempt} em ${delay}ms:`,
        error?.message || error
      );
    },
  });
}

/**
 * Retry específico para Stripe API
 */
export async function retryStripeAPI<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 5000,
    shouldRetry: (error, attempt) => {
      // Stripe rate limit
      if (error?.statusCode === 429 || error?.type === 'StripeRateLimitError') {
        return true;
      }

      // Stripe API error (server-side)
      if (error?.type === 'StripeAPIError' || error?.statusCode >= 500) {
        return true;
      }

      return defaultShouldRetry(error, attempt);
    },
    onRetry: (error, attempt, delay) => {
      console.warn(
        `[Stripe API] Retry ${attempt} em ${delay}ms:`,
        error?.message || error
      );
    },
  });
}

/**
 * Retry específico para Supabase
 */
export async function retrySupabase<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn, {
    maxRetries: 2,
    initialDelay: 500,
    backoffMultiplier: 2,
    maxDelay: 2000,
    shouldRetry: (error, attempt) => {
      // Timeout ou connection error
      if (
        error?.message?.includes('timeout') ||
        error?.message?.includes('connection') ||
        error?.code === 'PGRST301' // Supabase timeout
      ) {
        return true;
      }

      return defaultShouldRetry(error, attempt);
    },
    onRetry: (error, attempt, delay) => {
      console.warn(
        `[Supabase] Retry ${attempt} em ${delay}ms:`,
        error?.message || error
      );
    },
  });
}

/**
 * Executa múltiplas funções em paralelo com retry individual
 *
 * @example
 * ```typescript
 * const results = await retryAll([
 *   () => fetchData1(),
 *   () => fetchData2(),
 *   () => fetchData3(),
 * ]);
 * ```
 */
export async function retryAll<T>(
  fns: (() => Promise<T>)[],
  options: RetryOptions = {}
): Promise<T[]> {
  return Promise.all(fns.map((fn) => withRetry(fn, options)));
}

/**
 * Circuit Breaker simples
 * Após N falhas consecutivas, para de tentar por X tempo
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minuto
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Circuit aberto: não tentar
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailureTime < this.timeout) {
        throw new Error(
          `Circuit breaker is OPEN. Retry after ${Math.ceil(
            (this.timeout - (now - this.lastFailureTime)) / 1000
          )}s`
        );
      }
      // Timeout passou, tentar novamente (half-open)
      this.state = 'half-open';
    }

    try {
      const result = await fn();

      // Sucesso: resetar
      this.failures = 0;
      this.state = 'closed';

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
        console.error(
          `[Circuit Breaker] OPENED after ${this.failures} failures. Will retry in ${
            this.timeout / 1000
          }s`
        );
      }

      throw error;
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'closed';
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
