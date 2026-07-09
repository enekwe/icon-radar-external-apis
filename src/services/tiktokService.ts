import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { CircuitBreaker } from '../utils/circuitBreaker';
import { CacheManager } from '../utils/cache';
import { RateLimiter } from '../utils/rateLimiter';
import {
  TikTokUser,
  TikTokVideo,
  TikTokAnalytics,
  APIResponse,
  ExternalAPIError,
} from '../types';

export class TikTokService {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private cache: CacheManager;
  private rateLimiter: RateLimiter;
  private readonly baseURL: string;
  private readonly accessToken: string;
  private readonly cacheTTL: number;

  constructor() {
    this.baseURL = process.env.TIKTOK_BASE_URL || 'https://open.tiktokapis.com/v2';
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN || '';
    this.cacheTTL = parseInt(process.env.TIKTOK_CACHE_TTL || '1800000', 10);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    this.circuitBreaker = new CircuitBreaker(
      'tiktok',
      parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
      parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10),
      parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10)
    );

    this.cache = new CacheManager();
    this.rateLimiter = new RateLimiter(
      'tiktok',
      parseInt(process.env.TIKTOK_RATE_LIMIT || '100', 10)
    );

    logger.info('TikTokService initialized', {
      baseURL: this.baseURL,
      cacheTTL: this.cacheTTL,
      rateLimit: process.env.TIKTOK_RATE_LIMIT,
    });
  }

  async getUser(username: string): Promise<APIResponse<TikTokUser>> {
    const cacheKey = `tiktok:user:${username}`;

    try {
      // Check cache first
      const cached = await this.cache.get<TikTokUser>(cacheKey);
      if (cached) {
        logger.debug('TikTok user cache hit', { username });
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
        logger.info('TikTok get user', { username });

        const response = await this.client.post('/user/info/', {
          fields: [
            'open_id',
            'union_id',
            'avatar_url',
            'avatar_url_100',
            'avatar_large_url',
            'display_name',
            'bio_description',
            'profile_deep_link',
            'follower_count',
            'following_count',
            'likes_count',
            'video_count',
          ],
        });

        return this.transformUser(response.data.data, username);
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
      return this.handleError('getUser', error, { username });
    }
  }

  async getUserVideos(username: string, maxCount: number = 20): Promise<APIResponse<TikTokVideo[]>> {
    const cacheKey = `tiktok:videos:${username}:${maxCount}`;

    try {
      // Check cache first
      const cached = await this.cache.get<TikTokVideo[]>(cacheKey);
      if (cached) {
        logger.debug('TikTok videos cache hit', { username });
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
        logger.info('TikTok get user videos', { username, maxCount });

        const response = await this.client.post('/video/list/', {
          max_count: maxCount,
          fields: [
            'id',
            'create_time',
            'cover_image_url',
            'share_url',
            'video_description',
            'duration',
            'height',
            'width',
            'title',
            'like_count',
            'comment_count',
            'share_count',
            'view_count',
          ],
        });

        return response.data.data?.videos?.map((video: any) => this.transformVideo(video)) || [];
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
      return this.handleError('getUserVideos', error, { username, maxCount });
    }
  }

  async getVideoAnalytics(videoId: string): Promise<APIResponse<TikTokAnalytics>> {
    const cacheKey = `tiktok:analytics:${videoId}`;

    try {
      // Check cache first
      const cached = await this.cache.get<TikTokAnalytics>(cacheKey);
      if (cached) {
        logger.debug('TikTok analytics cache hit', { videoId });
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
        logger.info('TikTok get video analytics', { videoId });

        const response = await this.client.post('/video/query/', {
          filters: {
            video_ids: [videoId],
          },
          fields: [
            'id',
            'like_count',
            'comment_count',
            'share_count',
            'view_count',
          ],
        });

        const video = response.data.data?.videos?.[0];
        if (!video) {
          throw new Error('Video not found');
        }

        return this.transformAnalytics(video);
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
      return this.handleError('getVideoAnalytics', error, { videoId });
    }
  }

  private transformUser(data: any, username: string): TikTokUser {
    return {
      id: data.open_id || data.union_id || '',
      username: username,
      displayName: data.display_name || username,
      avatarUrl: data.avatar_url || data.avatar_url_100 || data.avatar_large_url || '',
      bioDescription: data.bio_description || '',
      followerCount: data.follower_count || 0,
      followingCount: data.following_count || 0,
      videoCount: data.video_count || 0,
      likeCount: data.likes_count || 0,
    };
  }

  private transformVideo(data: any): TikTokVideo {
    return {
      id: data.id || '',
      title: data.title || '',
      description: data.video_description || '',
      createTime: data.create_time || Date.now() / 1000,
      coverImageUrl: data.cover_image_url || '',
      videoUrl: data.share_url || '',
      duration: data.duration || 0,
      viewCount: data.view_count || 0,
      likeCount: data.like_count || 0,
      commentCount: data.comment_count || 0,
      shareCount: data.share_count || 0,
    };
  }

  private transformAnalytics(data: any): TikTokAnalytics {
    const views = data.view_count || 0;
    const likes = data.like_count || 0;
    const comments = data.comment_count || 0;
    const shares = data.share_count || 0;

    const engagement = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

    return {
      videoId: data.id || '',
      views,
      likes,
      comments,
      shares,
      engagement: parseFloat(engagement.toFixed(2)),
      averageWatchTime: data.average_watch_time,
      trafficSourceTypes: data.traffic_source_types,
    };
  }

  private handleError(method: string, error: unknown, context?: any): APIResponse<any> {
    const axiosError = error as any;

    const apiError: ExternalAPIError = {
      name: 'TikTokAPIError',
      message: axiosError.message || 'Unknown error',
      provider: 'tiktok',
      statusCode: axiosError.response?.status,
      response: axiosError.response?.data,
      isRateLimitError: axiosError.response?.status === 429,
      isAuthError: axiosError.response?.status === 401 || axiosError.response?.status === 403,
    };

    logger.error('TikTok API error', {
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

export const tiktokService = new TikTokService();
