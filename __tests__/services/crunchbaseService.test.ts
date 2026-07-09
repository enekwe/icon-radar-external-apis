import nock from 'nock';
import { crunchbaseService } from '../../src/services/crunchbaseService';

describe('CrunchbaseService', () => {
  const baseURL = 'https://api.crunchbase.com/api/v4';

  afterEach(() => {
    nock.cleanAll();
  });

  describe('searchOrganizations', () => {
    it('should search organizations successfully', async () => {
      const mockResponse = {
        entities: [
          {
            properties: {
              identifier: { uuid: '123' },
              name: 'Test Company',
              short_description: 'A test company',
              website: { value: 'https://test.com' },
            },
          },
        ],
      };

      nock(baseURL)
        .post('/searches/organizations')
        .reply(200, mockResponse);

      const result = await crunchbaseService.searchOrganizations({
        query: 'Test Company',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Test Company');
    });

    it('should handle API errors', async () => {
      nock(baseURL)
        .post('/searches/organizations')
        .reply(500, { error: 'Internal server error' });

      const result = await crunchbaseService.searchOrganizations({
        query: 'Test Company',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      nock(baseURL)
        .post('/searches/organizations')
        .reply(429, { error: 'Rate limit exceeded' });

      const result = await crunchbaseService.searchOrganizations({
        query: 'Test Company',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('getOrganization', () => {
    it('should get organization by ID successfully', async () => {
      const mockResponse = {
        properties: {
          identifier: { uuid: '123' },
          name: 'Test Company',
          short_description: 'A test company',
          website: { value: 'https://test.com' },
        },
      };

      nock(baseURL)
        .get('/entities/organizations/123')
        .query(true)
        .reply(200, mockResponse);

      const result = await crunchbaseService.getOrganization('123');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Test Company');
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        nock(baseURL)
          .post('/searches/organizations')
          .reply(500, { error: 'Server error' });

        await crunchbaseService.searchOrganizations({ query: 'test' });
      }

      const stats = crunchbaseService.getCircuitBreakerStats();
      expect(stats.state).toBe('OPEN');
      expect(stats.failureCount).toBeGreaterThanOrEqual(3);
    });
  });
});
