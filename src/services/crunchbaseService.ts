import axios, { AxiosInstance } from 'axios';
import { logger } from '@icon-radar/shared';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { CacheManager } from '../utils/cache';
import { RateLimiter } from '../utils/rateLimiter';
import {
  CrunchbaseOrganization,
  CrunchbaseSearchParams,
  APIResponse,
  ExternalAPIError,
} from '../types';

export class CrunchbaseService {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly cacheTTL: number;

  constructor() {
    this.baseURL = process.env.CRUNCHBASE_BASE_URL || 'https://api.crunchbase.com/api/v4';
    this.apiKey = process.env.CRUNCHBASE_API_KEY || '';
    this.cacheTTL = parseInt(process.env.CRUNCHBASE_CACHE_TTL || '3600000', 10);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'X-cb-user-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    this.circuitBreaker = new CircuitBreaker(
      'crunchbase',
      parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
      parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10)
    );

    this.cache = new CacheManager();
    this.rateLimiter = new RateLimiter(
      'crunchbase',
      parseInt(process.env.CRUNCHBASE_RATE_LIMIT || '200', 10)
    );

    logger.info('CrunchbaseService initialized', {
      baseURL: this.baseURL,
      cacheTTL: this.cacheTTL,
      rateLimit: process.env.CRUNCHBASE_RATE_LIMIT,
    });
  }

  async searchOrganizations(
    params: CrunchbaseSearchParams
  ): Promise<APIResponse<CrunchbaseOrganization[]>> {
    const cacheKey = `crunchbase:search:${JSON.stringify(params)}`;

    try {
      // Check cache first
      const cached = await this.cache.get<CrunchbaseOrganization[]>(cacheKey);
      if (cached) {
        logger.debug('Crunchbase search cache hit', { params });
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
        logger.info('Crunchbase organization search', { params });

        const fieldIds = params.fieldIds || [
          'name',
          'website',
          'short_description',
          'founded_on',
          'categories',
          'num_employees_enum',
          'revenue_range',
          'funding_total',
        ];

        const response = await this.client.post('/searches/organizations', {
          field_ids: fieldIds,
          query: [
            {
              type: 'predicate',
              field_id: 'name',
              operator_id: 'includes',
              values: [params.query],
            },
          ],
          limit: params.limit || 10,
        });

        return this.transformOrganizations(response.data);
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
      return this.handleError('searchOrganizations', error, params);
    }
  }

  async getOrganization(organizationId: string): Promise<APIResponse<CrunchbaseOrganization>> {
    const cacheKey = `crunchbase:org:${organizationId}`;

    try {
      // Check cache first
      const cached = await this.cache.get<CrunchbaseOrganization>(cacheKey);
      if (cached) {
        logger.debug('Crunchbase organization cache hit', { organizationId });
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
        logger.info('Crunchbase get organization', { organizationId });

        const response = await this.client.get(`/entities/organizations/${organizationId}`, {
          params: {
            field_ids: [
              'name',
              'website',
              'short_description',
              'founded_on',
              'categories',
              'num_employees_enum',
              'revenue_range',
              'funding_total',
              'founder_identifiers',
            ],
          },
        });

        return this.transformOrganization(response.data);
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
      return this.handleError('getOrganization', error, { organizationId });
    }
  }

  async searchPeople(query: string, limit: number = 10): Promise<APIResponse<any[]>> {
    const cacheKey = `crunchbase:people:${query}:${limit}`;

    try {
      // Check cache first
      const cached = await this.cache.get<any[]>(cacheKey);
      if (cached) {
        logger.debug('Crunchbase people search cache hit', { query });
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
        logger.info('Crunchbase people search', { query, limit });

        const response = await this.client.post('/searches/people', {
          field_ids: ['name', 'title', 'organization_name', 'primary_organization'],
          query: [
            {
              type: 'predicate',
              field_id: 'name',
              operator_id: 'includes',
              values: [query],
            },
          ],
          limit,
        });

        return response.data.entities || [];
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
      return this.handleError('searchPeople', error, { query, limit });
    }
  }

  private transformOrganizations(data: any): CrunchbaseOrganization[] {
    if (!data.entities || !Array.isArray(data.entities)) {
      return [];
    }

    return data.entities.map((entity: any) => this.transformOrganization({ properties: entity.properties }));
  }

  private transformOrganization(data: any): CrunchbaseOrganization {
    const props = data.properties || {};

    return {
      id: props.identifier?.uuid || '',
      name: props.name || '',
      description: props.short_description || '',
      website: props.website?.value || '',
      foundedDate: props.founded_on?.value || '',
      categories: props.categories?.map((cat: any) => cat.value) || [],
      numEmployees: props.num_employees_enum || '',
      revenue: props.revenue_range || '',
      fundingTotal: props.funding_total?.value_usd || 0,
      founders: props.founder_identifiers?.map((founder: any) => ({
        name: founder.value || '',
        title: founder.title || '',
      })) || [],
    };
  }

  private handleError(method: string, error: unknown, context?: any): APIResponse<any> {
    const axiosError = error as any;

    const apiError: ExternalAPIError = {
      name: 'CrunchbaseAPIError',
      message: axiosError.message || 'Unknown error',
      provider: 'crunchbase',
      statusCode: axiosError.response?.status,
      response: axiosError.response?.data,
      isRateLimitError: axiosError.response?.status === 429,
      isAuthError: axiosError.response?.status === 401 || axiosError.response?.status === 403,
    };

    logger.error('Crunchbase API error', {
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

export const crunchbaseService = new CrunchbaseService();
