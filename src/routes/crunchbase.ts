import { Router } from 'express';
import * as crunchbaseController from '../controllers/crunchbaseController';
import { requireServiceAuth } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(requireServiceAuth);
router.use(strictRateLimiter);

// POST /api/v1/crunchbase/search/organizations
router.post('/search/organizations', crunchbaseController.searchOrganizations);

// GET /api/v1/crunchbase/organization/:id
router.get('/organization/:id', crunchbaseController.getOrganization);

// POST /api/v1/crunchbase/search/people
router.post('/search/people', crunchbaseController.searchPeople);

export default router;
