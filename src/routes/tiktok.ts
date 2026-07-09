import { Router } from 'express';
import * as tiktokController from '../controllers/tiktokController';
import { requireServiceAuth } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(requireServiceAuth);
router.use(strictRateLimiter);

// GET /api/v1/tiktok/user/:username
router.get('/user/:username', tiktokController.getUser);

// GET /api/v1/tiktok/videos/:username
router.get('/videos/:username', tiktokController.getUserVideos);

// GET /api/v1/tiktok/analytics/:videoId
router.get('/analytics/:videoId', tiktokController.getVideoAnalytics);

export default router;
