import { logger } from './logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private requests: Map<string, RequestRecord> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly name: string;

  constructor(name: string, maxRequests: number = 100, windowMs: number = 60000) {
    this.name = name;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up expired records every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async acquire(key: string = 'default'): Promise<void> {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now >= record.resetTime) {
      // New window or expired window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      logger.debug('Rate limiter: Request allowed (new window)', {
        name: this.name,
        key,
        count: 1,
        maxRequests: this.maxRequests,
      });
      return;
    }

    if (record.count >= this.maxRequests) {
      const waitTime = record.resetTime - now;
      logger.warn('Rate limit exceeded, waiting', {
        name: this.name,
        key,
        count: record.count,
        maxRequests: this.maxRequests,
        waitTime,
      });

      await new Promise((resolve) => setTimeout(resolve, waitTime));

      // Reset after waiting
      this.requests.set(key, {
        count: 1,
        resetTime: Date.now() + this.windowMs,
      });
      return;
    }

    // Increment count
    record.count++;
    this.requests.set(key, record);

    logger.debug('Rate limiter: Request allowed', {
      name: this.name,
      key,
      count: record.count,
      maxRequests: this.maxRequests,
    });
  }

  getRemainingRequests(key: string = 'default'): number {
    const record = this.requests.get(key);
    if (!record || Date.now() >= record.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - record.count);
  }

  getResetTime(key: string = 'default'): number {
    const record = this.requests.get(key);
    if (!record || Date.now() >= record.resetTime) {
      return Date.now() + this.windowMs;
    }
    return record.resetTime;
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
      logger.info('Rate limiter reset for key', { name: this.name, key });
    } else {
      this.requests.clear();
      logger.info('Rate limiter completely reset', { name: this.name });
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of this.requests.entries()) {
      if (now >= record.resetTime) {
        this.requests.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limiter cleanup completed', {
        name: this.name,
        recordsCleaned: cleaned,
      });
    }
  }
}
