import { logger } from '@icon-radar/shared';
import { CircuitBreakerStats } from '../types';

export class CircuitBreaker {
  private failureCount: number = 0;
  private successCount: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private lastFailureTime?: number;
  private nextAttemptTime: number = Date.now();
  private readonly threshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;
  private readonly name: string;

  constructor(
    name: string,
    threshold: number = 5,
    timeout: number = 60000,
    resetTimeout: number = 30000
  ) {
    this.name = name;
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        logger.warn(`Circuit breaker OPEN, rejecting request`, {
          name: this.name,
          nextAttempt: new Date(this.nextAttemptTime).toISOString(),
        });
        throw error;
      }
      this.state = 'HALF_OPEN';
      logger.info(`Circuit breaker transitioning to HALF_OPEN`, { name: this.name });
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successCount++;
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info(`Circuit breaker closed after successful request`, {
        name: this.name,
        successCount: this.successCount,
      });
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`Circuit breaker failure recorded`, {
      name: this.name,
      failureCount: this.failureCount,
      threshold: this.threshold,
      state: this.state,
    });

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.timeout;

      logger.error(`Circuit breaker OPENED due to threshold breach`, {
        name: this.name,
        failureCount: this.failureCount,
        threshold: this.threshold,
        nextAttempt: new Date(this.nextAttemptTime).toISOString(),
      });
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.state === 'OPEN' ? this.nextAttemptTime : undefined,
    };
  }

  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = undefined;
    this.nextAttemptTime = Date.now();

    logger.info(`Circuit breaker manually reset`, { name: this.name });
  }
}
