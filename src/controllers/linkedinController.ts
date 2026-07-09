import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { linkedinService } from '../services/linkedinService';

export const getCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Company ID is required',
      });
      return;
    }

    logger.info('LinkedIn get company request', {
      correlationId: req.headers['x-correlation-id'] as string,
      companyId: id,
    });

    const result = await linkedinService.getCompany(id);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getCompany', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const searchCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const count = req.query.count ? parseInt(req.query.count as string, 10) : 10;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
      return;
    }

    logger.info('LinkedIn search companies request', {
      correlationId: req.headers['x-correlation-id'] as string,
      query,
      count,
    });

    const result = await linkedinService.searchCompanies(query, count);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in searchCompanies', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Profile ID is required',
      });
      return;
    }

    logger.info('LinkedIn get profile request', {
      correlationId: req.headers['x-correlation-id'] as string,
      profileId: id,
    });

    const result = await linkedinService.getProfile(id);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getProfile', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getCompanyFollowerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Company ID is required',
      });
      return;
    }

    logger.info('LinkedIn get company follower stats request', {
      correlationId: req.headers['x-correlation-id'] as string,
      companyId: id,
    });

    const result = await linkedinService.getCompanyFollowerStats(id);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getCompanyFollowerStats', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
