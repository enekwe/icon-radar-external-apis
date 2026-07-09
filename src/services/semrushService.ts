import axios, { AxiosInstance } from 'axios';
import { logger } from '@icon-radar/shared';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { CacheManager } from '../utils/cache';
import { RateLimiter } from '../utils/rateLimiter';
import {
  SemrushDomainOverview,
  SemrushDomainRank,
  SemrushTrafficStats,
  APIResponse,
  ExternalAPIError,
} from '../types';

export class SemrushService {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly cacheTTL: number;

  constructor() {
    this.baseURL = process.env.SEMRUSH_BASE_URL || 'https://api.semrush.com';
    this.apiKey = process.env.SEMRUSH_API_KEY || '';
    this.cacheTTL = parseInt(process.env.SEMRUSH_CACHE_TTL || '3600000', 10);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.circuitBreaker = new CircuitBreaker(
      'semrush',
      parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
      parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10)
    );

    this.cache = new CacheManager();
    this.rateLimiter = new RateLimiter(
      'semrush',
      parseInt(process.env.SEMRUSH_RATE_LIMIT || '10', 10),
      60000 // 1 minute window
    );

    logger.info('SemrushService initialized', {
      baseURL: this.baseURL,
      cacheTTL: this.cacheTTL,
      rateLimit: process.env.SEMRUSH_RATE_LIMIT,
    });
  }

  async getDomainOverview(domain: string, database: string = 'us'): Promise<APIResponse<SemrushDomainOverview>> {
    const cacheKey = `semrush:overview:${domain}:${database}`;

    try {
      // Check cache first
      const cached = await this.cache.get<SemrushDomainOverview>(cacheKey);
      if (cached) {
        logger.debug('Semrush domain overview cache hit', { domain });
        return {
          success: true,
          data: cached,
          cached: true,
          timestamp: new Date().toISOString(),
        };
      }

      // Rate limiting
      await this.rateLimiter.acquire();

      // Execute with circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        logger.info('Semrush get domain overview', { domain, database });

        const response = await this.client.get('/', {
          params: {
            type: 'domain_ranks',
            key: this.apiKey,
            export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At,Ac',
            domain,
            database,
          },
        });

        return this.parseDomainOverview(response.data, domain);
      });

      // Cache the result
      await this.cache.set(cacheKey, result, this.cacheTTL);

      return {
        success: true,
        data: result,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError('getDomainOverview', error, { domain, database });
    }
  }

  async getDomainRank(domain: string, database: string = 'us'): Promise<APIResponse<SemrushDomainRank>> {
    const cacheKey = `semrush:rank:${domain}:${database}`;

    try {
      // Check cache first
      const cached = await this.cache.get<SemrushDomainRank>(cacheKey);
      if (cached) {
        logger.debug('Semrush domain rank cache hit', { domain });
        return {
          success: true,
          data: cached,
          cached: true,
          timestamp: new Date().toISOString(),
        };
      }

      // Rate limiting
      await this.rateLimiter.acquire();

      // Execute with circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        logger.info('Semrush get domain rank', { domain, database });

        const response = await this.client.get('/', {
          params: {
            type: 'domain_rank',
            key: this.apiKey,
            export_columns: 'Dn,Rk,Or,Dt',
            domain,
            database,
          },
        });

        return this.parseDomainRank(response.data, domain, database);
      });

      // Cache the result
      await this.cache.set(cacheKey, result, this.cacheTTL);

      return {
        success: true,
        data: result,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError('getDomainRank', error, { domain, database });
    }
  }

  async getTrafficStats(domain: string, displayDate: string = ''): Promise<APIResponse<SemrushTrafficStats>> {
    const cacheKey = `semrush:traffic:${domain}:${displayDate}`;

    try {
      // Check cache first
      const cached = await this.cache.get<SemrushTrafficStats>(cacheKey);
      if (cached) {
        logger.debug('Semrush traffic stats cache hit', { domain });
        return {
          success: true,
          data: cached,
          cached: true,
          timestamp: new Date().toISOString(),
        };
      }

      // Rate limiting
      await this.rateLimiter.acquire();

      // Execute with circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        logger.info('Semrush get traffic stats', { domain, displayDate });

        const response = await this.client.get('/analytics/traffic/v1/summary/', {
          params: {
            key: this.apiKey,
            domain,
            display_date: displayDate || this.getLastMonth(),
          },
        });

        return this.parseTrafficStats(response.data, domain);
      });

      // Cache the result
      await this.cache.set(cacheKey, result, this.cacheTTL);

      return {
        success: true,
        data: result,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError('getTrafficStats', error, { domain, displayDate });
    }
  }

  async getKeywordResearch(keyword: string, database: string = 'us'): Promise<APIResponse<any>> {
    const cacheKey = `semrush:keyword:${keyword}:${database}`;

    try {
      // Check cache first
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) {
        logger.debug('Semrush keyword research cache hit', { keyword });
        return {
          success: true,
          data: cached,
          cached: true,
          timestamp: new Date().toISOString(),
        };
      }

      // Rate limiting
      await this.rateLimiter.acquire();

      // Execute with circuit breaker
      const result = await this.circuitBreaker.execute(async () => {
        logger.info('Semrush keyword research', { keyword, database });

        const response = await this.client.get('/', {
          params: {
            type: 'phrase_all',
            key: this.apiKey,
            export_columns: 'Ph,Nq,Cp,Co,Nr,Td',
            phrase: keyword,
            database,
          },
        });

        return this.parseKeywordData(response.data);
      });

      // Cache the result
      await this.cache.set(cacheKey, result, this.cacheTTL);

      return {
        success: true,
        data: result,
        cached: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError('getKeywordResearch', error, { keyword, database });
    }
  }

  private parseDomainOverview(data: string, domain: string): SemrushDomainOverview {
    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid response format');
    }

    const values = lines[1].split(';');

    return {
      domain,
      rank: parseInt(values[1] || '0', 10),
      organicKeywords: parseInt(values[2] || '0', 10),
      organicTraffic: parseInt(values[3] || '0', 10),
      organicCost: parseFloat(values[4] || '0'),
      paidKeywords: parseInt(values[5] || '0', 10),
      paidTraffic: parseInt(values[6] || '0', 10),
      paidCost: parseFloat(values[7] || '0'),
    };
  }

  private parseDomainRank(data: string, domain: string, country: string): SemrushDomainRank {
    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('Invalid response format');
    }

    const values = lines[1].split(';');

    return {
      domain,
      rank: parseInt(values[1] || '0', 10),
      country,
      date: values[3] || new Date().toISOString().split('T')[0],
    };
  }

  private parseTrafficStats(data: any, domain: string): SemrushTrafficStats {
    return {
      domain,
      visits: data.visits || 0,
      uniqueVisitors: data.unique_visitors || 0,
      pagesPerVisit: data.pages_per_visit || 0,
      bounceRate: data.bounce_rate || 0,
      avgVisitDuration: data.avg_visit_duration || 0,
      date: data.date || new Date().toISOString().split('T')[0],
    };
  }

  private parseKeywordData(data: string): any {
    const lines = data.trim().split('\n');
    if (lines.length < 2) {
      return null;
    }

    const headers = lines[0].split(';');
    const values = lines[1].split(';');

    const result: any = {};
    headers.forEach((header: string, index: number) => {
      result[header] = values[index] || '';
    });

    return result;
  }

  private getLastMonth(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}${month}15`;
  }

  private handleError(method: string, error: unknown, context?: any): APIResponse<any> {
    const axiosError = error as any;

    const apiError: ExternalAPIError = {
      name: 'SemrushAPIError',
      message: axiosError.message || 'Unknown error',
      provider: 'semrush',
      statusCode: axiosError.response?.status,
      response: axiosError.response?.data,
      isRateLimitError: axiosError.response?.status === 429,
      isAuthError: axiosError.response?.status === 401 || axiosError.response?.status === 403,
    };

    logger.error('Semrush API error', {
      method,
      context,
      statusCode: apiError.statusCode,
      error: apiError,
      isRateLimitError: apiError.isRateLimitError,
      isAuthError: apiError.isAuthError,
    });

    return {
      success: false,
      error: apiError.message,
      timestamp: new Date().toISOString(),
    };
  }

  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  getRateLimitInfo() {
    return {
      remaining: this.rateLimiter.getRemainingRequests(),
      reset: this.rateLimiter.getResetTime(),
    };
  }
}

export const semrushService = new SemrushService();
