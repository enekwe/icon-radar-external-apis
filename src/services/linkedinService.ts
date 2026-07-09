import axios, { AxiosInstance } from 'axios';
import { logger } from '@icon-radar/shared';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { CacheManager } from '../utils/cache';
import { RateLimiter } from '../utils/rateLimiter';
import {
  LinkedInCompany,
  LinkedInProfile,
  APIResponse,
  ExternalAPIError,
} from '../types';

export class LinkedInService {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  private readonly baseURL: string;
  private readonly accessToken: string;
  private readonly cacheTTL: number;

  constructor() {
    this.baseURL = process.env.LINKEDIN_BASE_URL || 'https://api.linkedin.com/v2';
    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN || '';
    this.cacheTTL = parseInt(process.env.LINKEDIN_CACHE_TTL || '3600000', 10);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    this.circuitBreaker = new CircuitBreaker(
      'linkedin',
      parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
      parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10)
    );

    this.cache = new CacheManager();
    this.rateLimiter = new RateLimiter(
      'linkedin',
      parseInt(process.env.LINKEDIN_RATE_LIMIT || '100', 10)
    );

    logger.info('LinkedInService initialized', {
      baseURL: this.baseURL,
      cacheTTL: this.cacheTTL,
      rateLimit: process.env.LINKEDIN_RATE_LIMIT,
    });
  }

  async getCompany(companyId: string): Promise<APIResponse<LinkedInCompany>> {
    const cacheKey = `linkedin:company:${companyId}`;

    try {
      // Check cache first
      const cached = await this.cache.get<LinkedInCompany>(cacheKey);
      if (cached) {
        logger.debug('LinkedIn company cache hit', { companyId });
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
        logger.info('LinkedIn get company', { companyId });

        const response = await this.client.get(`/organizations/${companyId}`, {
          params: {
            projection: '(id,name,localizedName,description,website,industries,specialties,locations,foundedYear,staffCount,followerCount)',
          },
        });

        return this.transformCompany(response.data);
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
      return this.handleError('getCompany', error, { companyId });
    }
  }

  async searchCompanies(query: string, count: number = 10): Promise<APIResponse<LinkedInCompany[]>> {
    const cacheKey = `linkedin:company-search:${query}:${count}`;

    try {
      // Check cache first
      const cached = await this.cache.get<LinkedInCompany[]>(cacheKey);
      if (cached) {
        logger.debug('LinkedIn company search cache hit', { query });
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
        logger.info('LinkedIn search companies', { query, count });

        const response = await this.client.get('/organizationSearches', {
          params: {
            keywords: query,
            count,
            projection: '(elements*(organization~(id,name,localizedName,description,website,industries,specialties,locations,foundedYear,staffCount,followerCount)))',
          },
        });

        return response.data.elements?.map((item: any) => this.transformCompany(item.organization)) || [];
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
      return this.handleError('searchCompanies', error, { query, count });
    }
  }

  async getProfile(profileId: string): Promise<APIResponse<LinkedInProfile>> {
    const cacheKey = `linkedin:profile:${profileId}`;

    try {
      // Check cache first
      const cached = await this.cache.get<LinkedInProfile>(cacheKey);
      if (cached) {
        logger.debug('LinkedIn profile cache hit', { profileId });
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
        logger.info('LinkedIn get profile', { profileId });

        const response = await this.client.get(`/people/${profileId}`, {
          params: {
            projection: '(id,firstName,lastName,headline,location,industry,profilePicture,positions)',
          },
        });

        return this.transformProfile(response.data);
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
      return this.handleError('getProfile', error, { profileId });
    }
  }

  async getCompanyFollowerStats(companyId: string): Promise<APIResponse<any>> {
    const cacheKey = `linkedin:company-followers:${companyId}`;

    try {
      // Check cache first
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) {
        logger.debug('LinkedIn company followers cache hit', { companyId });
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
        logger.info('LinkedIn get company follower stats', { companyId });

        const response = await this.client.get(`/organizationalEntityFollowerStatistics`, {
          params: {
            q: 'organizationalEntity',
            organizationalEntity: `urn:li:organization:${companyId}`,
          },
        });

        return response.data.elements?.[0] || { followerCount: 0 };
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
      return this.handleError('getCompanyFollowerStats', error, { companyId });
    }
  }

  private transformCompany(data: any): LinkedInCompany {
    const location = data.locations?.elements?.[0];

    return {
      id: data.id || '',
      name: data.localizedName || data.name || '',
      description: data.description?.localized?.en_US || '',
      website: data.website || '',
      industry: data.industries?.elements?.[0] || '',
      companySize: data.staffCount || '',
      foundedYear: data.foundedYear,
      headquarters: {
        city: location?.city || '',
        country: location?.country || '',
      },
      specialties: data.specialties?.elements || [],
      followerCount: data.followerCount || 0,
    };
  }

  private transformProfile(data: any): LinkedInProfile {
    return {
      id: data.id || '',
      firstName: data.firstName?.localized?.en_US || '',
      lastName: data.lastName?.localized?.en_US || '',
      headline: data.headline?.localized?.en_US || '',
      location: data.location || '',
      industry: data.industry || '',
      profilePictureUrl: data.profilePicture?.displayImage || '',
      positions: data.positions?.elements?.map((pos: any) => ({
        title: pos.title?.localized?.en_US || '',
        company: pos.companyName?.localized?.en_US || '',
        startDate: pos.timePeriod?.startDate ?
          `${pos.timePeriod.startDate.year}-${pos.timePeriod.startDate.month || '01'}` : '',
        endDate: pos.timePeriod?.endDate ?
          `${pos.timePeriod.endDate.year}-${pos.timePeriod.endDate.month || '01'}` : '',
      })) || [],
    };
  }

  private handleError(method: string, error: unknown, context?: any): APIResponse<any> {
    const axiosError = error as any;

    const apiError: ExternalAPIError = {
      name: 'LinkedInAPIError',
      message: axiosError.message || 'Unknown error',
      provider: 'linkedin',
      statusCode: axiosError.response?.status,
      response: axiosError.response?.data,
      isRateLimitError: axiosError.response?.status === 429,
      isAuthError: axiosError.response?.status === 401 || axiosError.response?.status === 403,
    };

    logger.error('LinkedIn API error', {
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

export const linkedinService = new LinkedInService();
