import axios, { AxiosInstance } from 'axios';
import { logger } from '@icon-radar/shared';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { CacheManager } from '../utils/cache';
import { RateLimiter } from '../utils/rateLimiter';
import {
  MetaProfile,
  MetaInsights,
  MetaMedia,
  APIResponse,
  ExternalAPIError,
} from '../types';

export class MetaService {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  private readonly baseURL: string;
  private readonly accessToken: string;
  private readonly cacheTTL: number;

  constructor() {
    this.baseURL = process.env.META_BASE_URL || 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.META_ACCESS_TOKEN || '';
    this.cacheTTL = parseInt(process.env.META_CACHE_TTL || '1800000', 10);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.circuitBreaker = new CircuitBreaker(
      'meta',
      parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
      parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10)
    );

    this.cache = new CacheManager();
    this.rateLimiter = new RateLimiter(
      'meta',
      parseInt(process.env.META_RATE_LIMIT || '200', 10)
    );

    logger.info('MetaService initialized', {
      baseURL: this.baseURL,
      cacheTTL: this.cacheTTL,
      rateLimit: process.env.META_RATE_LIMIT,
    });
  }

  async getProfile(username: string): Promise<APIResponse<MetaProfile>> {
    const cacheKey = `meta:profile:${username}`;

    try {
      // Check cache first
      const cached = await this.cache.get<MetaProfile>(cacheKey);
      if (cached) {
        logger.debug('Meta profile cache hit', { username });
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
        logger.info('Meta get profile', { username });

        // First, get the Instagram Business Account ID
        const searchResponse = await this.client.get('/ig_hashtag_search', {
          params: {
            user_id: username,
            q: username,
            access_token: this.accessToken,
          },
        });

        if (!searchResponse.data.data || searchResponse.data.data.length === 0) {
          throw new Error('Profile not found');
        }

        const userId = searchResponse.data.data[0].id;

        // Get profile details
        const profileResponse = await this.client.get(`/${userId}`, {
          params: {
            fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website',
            access_token: this.accessToken,
          },
        });

        return this.transformProfile(profileResponse.data);
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
      return this.handleError('getProfile', error, { username });
    }
  }

  async getInsights(username: string, period: string = 'day'): Promise<APIResponse<MetaInsights>> {
    const cacheKey = `meta:insights:${username}:${period}`;

    try {
      // Check cache first
      const cached = await this.cache.get<MetaInsights>(cacheKey);
      if (cached) {
        logger.debug('Meta insights cache hit', { username, period });
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
        logger.info('Meta get insights', { username, period });

        const response = await this.client.get(`/${username}/insights`, {
          params: {
            metric: 'impressions,reach,profile_views,follower_count,website_clicks,email_contacts,get_directions_clicks,phone_call_clicks',
            period,
            access_token: this.accessToken,
          },
        });

        return this.transformInsights(response.data);
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
      return this.handleError('getInsights', error, { username, period });
    }
  }

  async getMedia(mediaId: string): Promise<APIResponse<MetaMedia>> {
    const cacheKey = `meta:media:${mediaId}`;

    try {
      // Check cache first
      const cached = await this.cache.get<MetaMedia>(cacheKey);
      if (cached) {
        logger.debug('Meta media cache hit', { mediaId });
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
        logger.info('Meta get media', { mediaId });

        const response = await this.client.get(`/${mediaId}`, {
          params: {
            fields: 'id,media_type,media_url,thumbnail_url,caption,like_count,comments_count,timestamp',
            access_token: this.accessToken,
          },
        });

        return this.transformMedia(response.data);
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
      return this.handleError('getMedia', error, { mediaId });
    }
  }

  async getUserMedia(username: string, limit: number = 25): Promise<APIResponse<MetaMedia[]>> {
    const cacheKey = `meta:user-media:${username}:${limit}`;

    try {
      // Check cache first
      const cached = await this.cache.get<MetaMedia[]>(cacheKey);
      if (cached) {
        logger.debug('Meta user media cache hit', { username });
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
        logger.info('Meta get user media', { username, limit });

        const response = await this.client.get(`/${username}/media`, {
          params: {
            fields: 'id,media_type,media_url,thumbnail_url,caption,like_count,comments_count,timestamp',
            limit,
            access_token: this.accessToken,
          },
        });

        return response.data.data?.map((item: any) => this.transformMedia(item)) || [];
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
      return this.handleError('getUserMedia', error, { username, limit });
    }
  }

  private transformProfile(data: any): MetaProfile {
    return {
      id: data.id || '',
      username: data.username || '',
      name: data.name || '',
      biography: data.biography || '',
      followersCount: data.followers_count || 0,
      followsCount: data.follows_count || 0,
      mediaCount: data.media_count || 0,
      profilePictureUrl: data.profile_picture_url || '',
      website: data.website || '',
    };
  }

  private transformInsights(data: any): MetaInsights {
    const metrics: Record<string, number> = {};

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((item: any) => {
        const value = item.values?.[0]?.value || 0;
        metrics[item.name] = typeof value === 'number' ? value : 0;
      });
    }

    return {
      impressions: metrics.impressions || 0,
      reach: metrics.reach || 0,
      profileViews: metrics.profile_views || 0,
      followerCount: metrics.follower_count || 0,
      websiteClicks: metrics.website_clicks || 0,
      emailContacts: metrics.email_contacts || 0,
      getDirectionsClicks: metrics.get_directions_clicks || 0,
      phoneCallClicks: metrics.phone_call_clicks || 0,
    };
  }

  private transformMedia(data: any): MetaMedia {
    return {
      id: data.id || '',
      mediaType: data.media_type || 'IMAGE',
      mediaUrl: data.media_url || '',
      thumbnail: data.thumbnail_url || '',
      caption: data.caption || '',
      likeCount: data.like_count || 0,
      commentsCount: data.comments_count || 0,
      timestamp: data.timestamp || new Date().toISOString(),
    };
  }

  private handleError(method: string, error: unknown, context?: any): APIResponse<any> {
    const axiosError = error as any;

    const apiError: ExternalAPIError = {
      name: 'MetaAPIError',
      message: axiosError.message || 'Unknown error',
      provider: 'meta',
      statusCode: axiosError.response?.status,
      response: axiosError.response?.data,
      isRateLimitError: axiosError.response?.status === 429 || axiosError.response?.data?.error?.code === 4,
      isAuthError: axiosError.response?.status === 401 || axiosError.response?.data?.error?.code === 190,
    };

    logger.error('Meta API error', {
      method,
      context,
      statusCode: apiError.statusCode,
      error: apiError,
      isRateLimitError: apiError.isRateLimitError,
      isAuthError: apiError.isAuthError,
      errorCode: axiosError.response?.data?.error?.code,
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

export const metaService = new MetaService();
