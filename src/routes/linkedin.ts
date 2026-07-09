import { Router } from 'express';
import * as linkedinController from '../controllers/linkedinController';
import { requireServiceAuth } from '../middleware/auth';
import { strictRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(requireServiceAuth);
router.use(strictRateLimiter);

// GET /api/v1/linkedin/company/:id
router.get('/company/:id', linkedinController.getCompany);

// GET /api/v1/linkedin/company/search
router.get('/company/search', linkedinController.searchCompanies);

// GET /api/v1/linkedin/profile/:id
router.get('/profile/:id', linkedinController.getProfile);

// GET /api/v1/linkedin/company/:id/followers
router.get('/company/:id/followers', linkedinController.getCompanyFollowerStats);

export default router;
