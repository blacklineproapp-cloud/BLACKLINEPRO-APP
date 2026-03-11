import { logger } from './logger';

/**
 * Circuit Breaker para serviços externos (Redis, APIs, etc.)
 *
 * Estados:
 * - CLOSED:    Operação normal, requests passam normalmente
 * - OPEN:      Serviço indisponível, requests falham imediatamente (fast-fail)
 * - HALF_OPEN: Período de teste — permite 1 request para verificar recuperação
 *
 * Configuração:
 * - failureThreshold: quantas falhas consecutivas abrem o circuito (default: 5)
 * - resetTimeoutMs:   quanto tempo fica OPEN antes de testar (default: 30s)
 * - successThreshold: quantos sucessos em HALF_OPEN fecham o circuito (default: 2)
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Nome do serviço (para logs) */
  name: string;
  /** Falhas consecutivas para abrir o circuito */
  failureThreshold?: number;
  /** Tempo em ms antes de tentar HALF_OPEN */
  resetTimeoutMs?: number;
  /** Sucessos em HALF_OPEN para fechar o circuito */
  successThreshold?: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly successThreshold: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.successThreshold = options.successThreshold ?? 2;
  }

  /**
   * Executa uma operação protegida pelo circuit breaker.
   * Se o circuito está OPEN, retorna o fallback imediatamente (fast-fail).
   */
  async execute<T>(
    operation: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    // Se OPEN, verificar se é hora de tentar HALF_OPEN
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info(`[CircuitBreaker:${this.name}] OPEN → HALF_OPEN (testando recuperação)`);
      } else {
        // Fast-fail: não tenta a operação
        return fallback;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      return fallback;
    }
  }

  /**
   * Versão síncrona para operações que não precisam de async
   */
  canExecute(): boolean {
    if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
      return true;
    }

    // OPEN: verificar timeout
    if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      logger.info(`[CircuitBreaker:${this.name}] OPEN → HALF_OPEN (testando recuperação)`);
      return true;
    }

    return false;
  }

  recordSuccess(): void {
    this.onSuccess();
  }

  recordFailure(): void {
    this.onFailure();
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        logger.info(`[CircuitBreaker:${this.name}] HALF_OPEN → CLOSED (serviço recuperado)`);
      }
    } else {
      // CLOSED: reset failure count on success
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Falha durante teste: volta para OPEN
      this.state = 'OPEN';
      this.successCount = 0;
      logger.warn(`[CircuitBreaker:${this.name}] HALF_OPEN → OPEN (falha no teste de recuperação)`);
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn(`[CircuitBreaker:${this.name}] CLOSED → OPEN (${this.failureCount} falhas consecutivas)`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime > 0
        ? new Date(this.lastFailureTime).toISOString()
        : null,
    };
  }
}
