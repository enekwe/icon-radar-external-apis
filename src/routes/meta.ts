import { Router } from 'express';
import * as metaController from '../controllers/metaController';
import { requireServiceAuth } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(requireServiceAuth);
router.use(strictRateLimiter);

// GET /api/v1/meta/profile/:username
router.get('/profile/:username', metaController.getProfile);

// GET /api/v1/meta/insights/:username
router.get('/insights/:username', metaController.getInsights);

// GET /api/v1/meta/media/:mediaId
router.get('/media/:mediaId', metaController.getMedia);

// GET /api/v1/meta/user/:username/media
router.get('/user/:username/media', metaController.getUserMedia);

export default router;
