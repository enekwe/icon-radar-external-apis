# Icon Radar External APIs Service

Centralized external API integration microservice for Icon Radar. Provides unified access to Crunchbase, Meta/Instagram, TikTok, LinkedIn, and Semrush APIs with built-in rate limiting, caching, and circuit breaker patterns.

## Service Overview

**Port:** 3008
**Type:** Integration Service
**Version:** 1.0.0

### Key Features

- Unified interface for 5 external API providers
- Per-provider rate limiting with automatic queuing
- Redis-based response caching with configurable TTL
- Circuit breaker pattern for resilience
- Retry logic with exponential backoff
- Comprehensive error handling
- API usage tracking and metrics
- Health checks per provider

## External API Providers

### 1. Crunchbase API
- Company ownership data
- Founder information
- Funding and valuation data
- **Rate Limit:** 200 requests/minute
- **Cache TTL:** 1 hour

### 2. Meta/Instagram API
- Profile metrics and insights
- Media engagement data
- Follower analytics
- **Rate Limit:** 200 requests/minute
- **Cache TTL:** 30 minutes

### 3. TikTok API
- User profile data
- Video performance metrics
- Engagement analytics
- **Rate Limit:** 100 requests/minute
- **Cache TTL:** 30 minutes

### 4. LinkedIn API
- Company profiles
- Employee data
- Follower statistics
- **Rate Limit:** 100 requests/minute
- **Cache TTL:** 1 hour

### 5. Semrush API
- Website traffic data
- SEO metrics
- Domain rankings
- **Rate Limit:** 10 requests/minute
- **Cache TTL:** 1 hour

## API Endpoints

### Crunchbase Endpoints

```
POST   /api/v1/crunchbase/search/organizations
GET    /api/v1/crunchbase/organization/:id
POST   /api/v1/crunchbase/search/people
```

### Meta/Instagram Endpoints

```
GET    /api/v1/meta/profile/:username
GET    /api/v1/meta/insights/:username
GET    /api/v1/meta/media/:mediaId
GET    /api/v1/meta/user/:username/media
```

### TikTok Endpoints

```
GET    /api/v1/tiktok/user/:username
GET    /api/v1/tiktok/videos/:username
GET    /api/v1/tiktok/analytics/:videoId
```

### LinkedIn Endpoints

```
GET    /api/v1/linkedin/company/:id
GET    /api/v1/linkedin/company/search
GET    /api/v1/linkedin/profile/:id
GET    /api/v1/linkedin/company/:id/followers
```

### Semrush Endpoints

```
GET    /api/v1/semrush/domain/:domain/overview
GET    /api/v1/semrush/domain/:domain/rank
GET    /api/v1/semrush/domain/:domain/traffic
GET    /api/v1/semrush/keyword
```

### Health & Status Endpoints

```
GET    /health                 # Basic health check
GET    /health/ready           # Readiness probe with circuit breaker status
GET    /health/live            # Liveness probe
GET    /api/v1/status          # Detailed status of all providers
```

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run database migrations (if needed)
npm run db:migrate

# Start development server
npm run dev

# Start production server
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Service Configuration
PORT=3008
SERVICE_NAME=external-apis
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
SERVICE_API_KEY=your-service-api-key

# Crunchbase
CRUNCHBASE_API_KEY=your-key
CRUNCHBASE_RATE_LIMIT=200

# Meta/Instagram
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_ACCESS_TOKEN=your-token
META_RATE_LIMIT=200

# TikTok
TIKTOK_CLIENT_KEY=your-key
TIKTOK_CLIENT_SECRET=your-secret
TIKTOK_ACCESS_TOKEN=your-token
TIKTOK_RATE_LIMIT=100

# LinkedIn
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-secret
LINKEDIN_ACCESS_TOKEN=your-token
LINKEDIN_RATE_LIMIT=100

# Semrush
SEMRUSH_API_KEY=your-key
SEMRUSH_RATE_LIMIT=10

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
```

## Usage Examples

### Search Crunchbase Organizations

```bash
curl -X POST http://localhost:3008/api/v1/crunchbase/search/organizations \
  -H "Content-Type: application/json" \
  -H "x-service-api-key: your-api-key" \
  -d '{"query": "Tesla", "limit": 10}'
```

### Get Instagram Profile

```bash
curl http://localhost:3008/api/v1/meta/profile/nike \
  -H "x-service-api-key: your-api-key"
```

### Get TikTok User Data

```bash
curl http://localhost:3008/api/v1/tiktok/user/lebronjames \
  -H "x-service-api-key: your-api-key"
```

### Get LinkedIn Company

```bash
curl http://localhost:3008/api/v1/linkedin/company/1441 \
  -H "x-service-api-key: your-api-key"
```

### Get Semrush Domain Overview

```bash
curl http://localhost:3008/api/v1/semrush/domain/nike.com/overview \
  -H "x-service-api-key: your-api-key"
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Architecture

### Circuit Breaker Pattern

Each API provider has a dedicated circuit breaker that:
- Opens after 5 consecutive failures
- Stays open for 60 seconds
- Transitions to half-open for testing
- Automatically closes on success

### Rate Limiting

Provider-specific rate limiters:
- Track requests per time window
- Automatically queue excess requests
- Return rate limit info in responses
- Reset on window expiration

### Caching Strategy

Redis-based caching with TTL:
- Cache key includes all request parameters
- Automatic cache invalidation
- Configurable TTL per provider
- Cache hit/miss tracking

## Error Handling

All errors follow a standard format:

```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2026-07-09T12:00:00.000Z"
}
```

Success responses include:

```json
{
  "success": true,
  "data": { ... },
  "cached": false,
  "timestamp": "2026-07-09T12:00:00.000Z"
}
```

## Monitoring

### Health Check Response

```json
{
  "status": "ready",
  "service": "external-apis",
  "timestamp": "2026-07-09T12:00:00.000Z",
  "checks": {
    "crunchbase": {
      "state": "CLOSED",
      "failureCount": 0,
      "successCount": 150
    },
    "meta": { ... },
    "tiktok": { ... },
    "linkedin": { ... },
    "semrush": { ... }
  }
}
```

### Status Endpoint

Provides detailed info about all providers:
- Circuit breaker state
- Rate limit remaining/reset
- Success/failure counts

## Docker Deployment

```bash
# Build image
docker build -t icon-radar-external-apis .

# Run container
docker run -p 3008:3008 \
  --env-file .env \
  icon-radar-external-apis
```

## Railway Deployment

The service auto-deploys to Railway when pushed to the main branch. Ensure all environment variables are configured in Railway dashboard.

## Contributing

1. Follow the development standards in `/Users/cope/IconRadar/skills.md`
2. Write tests for all new features
3. Ensure 80%+ test coverage
4. Update this README for API changes

## License

MIT
