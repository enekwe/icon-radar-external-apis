import request from 'supertest';
import express from 'express';
import crunchbaseRoutes from '../../src/routes/crunchbase';
import { crunchbaseService } from '../../src/services/crunchbaseService';

jest.mock('../../src/services/crunchbaseService');

const app = express();
app.use(express.json());
app.use('/api/v1/crunchbase', crunchbaseRoutes);

describe('CrunchbaseController', () => {
  const mockServiceApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/crunchbase/search/organizations', () => {
    it('should search organizations with valid input', async () => {
      const mockResult = {
        success: true,
        data: [
          {
            id: '123',
            name: 'Test Company',
            description: 'A test company',
            website: 'https://test.com',
          },
        ],
        cached: false,
        timestamp: new Date().toISOString(),
      };

      (crunchbaseService.searchOrganizations as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/v1/crunchbase/search/organizations')
        .set('x-service-api-key', mockServiceApiKey)
        .send({ query: 'Test Company' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/v1/crunchbase/search/organizations')
        .set('x-service-api-key', mockServiceApiKey)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without API key', async () => {
      const response = await request(app)
        .post('/api/v1/crunchbase/search/organizations')
        .send({ query: 'Test Company' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/crunchbase/organization/:id', () => {
    it('should get organization by ID', async () => {
      const mockResult = {
        success: true,
        data: {
          id: '123',
          name: 'Test Company',
          description: 'A test company',
        },
        cached: false,
        timestamp: new Date().toISOString(),
      };

      (crunchbaseService.getOrganization as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/crunchbase/organization/123')
        .set('x-service-api-key', mockServiceApiKey);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('123');
    });
  });
});
