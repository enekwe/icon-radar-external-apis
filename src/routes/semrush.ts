import { Router } from 'express';
import * as semrushController from '../controllers/semrushController';
import { requireServiceAuth } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(requireServiceAuth);
router.use(strictRateLimiter);

// GET /api/v1/semrush/domain/:domain/overview
router.get('/domain/:domain/overview', semrushController.getDomainOverview);

// GET /api/v1/semrush/domain/:domain/rank
router.get('/domain/:domain/rank', semrushController.getDomainRank);

// GET /api/v1/semrush/domain/:domain/traffic
router.get('/domain/:domain/traffic', semrushController.getTrafficStats);

// GET /api/v1/semrush/keyword
router.get('/keyword', semrushController.getKeywordResearch);

export default router;
