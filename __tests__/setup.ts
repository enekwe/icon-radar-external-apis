// Jest setup file
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3008';
  process.env.SERVICE_NAME = 'external-apis';
  process.env.SERVICE_API_KEY = 'test-api-key';
  process.env.REDIS_URL = 'redis://localhost:6379';

  // Mock API keys
  process.env.CRUNCHBASE_API_KEY = 'test-crunchbase-key';
  process.env.META_ACCESS_TOKEN = 'test-meta-token';
  process.env.TIKTOK_ACCESS_TOKEN = 'test-tiktok-token';
  process.env.LINKEDIN_ACCESS_TOKEN = 'test-linkedin-token';
  process.env.SEMRUSH_API_KEY = 'test-semrush-key';

  // Rate limits for testing
  process.env.CRUNCHBASE_RATE_LIMIT = '100';
  process.env.META_RATE_LIMIT = '100';
  process.env.TIKTOK_RATE_LIMIT = '100';
  process.env.LINKEDIN_RATE_LIMIT = '100';
  process.env.SEMRUSH_RATE_LIMIT = '10';

  // Circuit breaker settings
  process.env.CIRCUIT_BREAKER_THRESHOLD = '3';
  process.env.CIRCUIT_BREAKER_TIMEOUT = '5000';
});

afterAll(() => {
  // Cleanup
});
