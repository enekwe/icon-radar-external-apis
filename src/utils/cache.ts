import Redis from 'ioredis';
import { logger } from '@icon-radar/shared';

export class CacheManager {
  private redis: Redis;
  private defaultTTL: number = 3600000; // 1 hour

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error });
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;

      const parsed = JSON.parse(value);
      logger.debug('Cache hit', { key });
      return parsed as T;
    } catch (error) {
      logger.error('Cache get error', { key, error: error instanceof Error ? error : new Error('Unknown error') });
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const ttlMs = ttl || this.defaultTTL;
      await this.redis.setex(key, Math.floor(ttlMs / 1000), serialized);
      logger.debug('Cache set', { key, ttl: ttlMs });
    } catch (error) {
      logger.error('Cache set error', { key, error: error instanceof Error ? error : new Error('Unknown error') });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      logger.debug('Cache deleted', { key });
    } catch (error) {
      logger.error('Cache delete error', { key, error: error instanceof Error ? error : new Error('Unknown error') });
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.info('Cache cleared with pattern', { pattern, keysDeleted: keys.length });
        }
      } else {
        await this.redis.flushdb();
        logger.info('Cache completely cleared');
      }
    } catch (error) {
      logger.error('Cache clear error', { pattern, error: error instanceof Error ? error : new Error('Unknown error') });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists check error', { key, error: error instanceof Error ? error : new Error('Unknown error') });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    logger.info('Redis connection closed');
  }
}

export const cacheManager = new CacheManager();
