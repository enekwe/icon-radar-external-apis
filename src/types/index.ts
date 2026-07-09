export interface CrunchbaseOrganization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  foundedDate?: string;
  categories?: string[];
  numEmployees?: string;
  revenue?: string;
  fundingTotal?: number;
  founders?: Array<{
    name: string;
    title?: string;
  }>;
}

export interface CrunchbaseSearchParams {
  query: string;
  fieldIds?: string[];
  limit?: number;
}

export interface MetaProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  mediaCount?: number;
  profilePictureUrl?: string;
  website?: string;
}

export interface MetaInsights {
  impressions: number;
  reach: number;
  profileViews: number;
  followerCount: number;
  websiteClicks?: number;
  emailContacts?: number;
  getDirectionsClicks?: number;
  phoneCallClicks?: number;
}

export interface MetaMedia {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  thumbnail?: string;
  caption?: string;
  likeCount: number;
  commentsCount: number;
  timestamp: string;
}

export interface TikTokUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bioDescription?: string;
  followerCount: number;
  followingCount: number;
  videoCount: number;
  likeCount: number;
}

export interface TikTokVideo {
  id: string;
  title: string;
  description?: string;
  createTime: number;
  coverImageUrl?: string;
  videoUrl?: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

export interface TikTokAnalytics {
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  averageWatchTime?: number;
  trafficSourceTypes?: Record<string, number>;
}

export interface LinkedInCompany {
  id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  foundedYear?: number;
  headquarters?: {
    city?: string;
    country?: string;
  };
  specialties?: string[];
  followerCount?: number;
}

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  location?: string;
  industry?: string;
  profilePictureUrl?: string;
  positions?: Array<{
    title: string;
    company: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export interface SemrushDomainOverview {
  domain: string;
  rank: number;
  organicKeywords: number;
  organicTraffic: number;
  organicCost: number;
  paidKeywords?: number;
  paidTraffic?: number;
  paidCost?: number;
}

export interface SemrushDomainRank {
  domain: string;
  rank: number;
  country: string;
  date: string;
}

export interface SemrushTrafficStats {
  domain: string;
  visits: number;
  uniqueVisitors: number;
  pagesPerVisit: number;
  bounceRate: number;
  avgVisitDuration: number;
  date: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface CircuitBreakerStats {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

export interface ExternalAPIError extends Error {
  provider: string;
  statusCode?: number;
  response?: unknown;
  isRateLimitError?: boolean;
  isAuthError?: boolean;
}
