import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { semrushService } from '../services/semrushService';

export const getDomainOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { domain } = req.params;
    const { database = 'us' } = req.query;

    if (!domain) {
      res.status(400).json({
        success: false,
        error: 'Domain is required',
      });
      return;
    }

    logger.info('Semrush get domain overview request', {
      correlationId: req.headers['x-correlation-id'] as string,
      domain,
      database,
    });

    const result = await semrushService.getDomainOverview(domain, database as string);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getDomainOverview', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getDomainRank = async (req: Request, res: Response): Promise<void> => {
  try {
    const { domain } = req.params;
    const { database = 'us' } = req.query;

    if (!domain) {
      res.status(400).json({
        success: false,
        error: 'Domain is required',
      });
      return;
    }

    logger.info('Semrush get domain rank request', {
      correlationId: req.headers['x-correlation-id'] as string,
      domain,
      database,
    });

    const result = await semrushService.getDomainRank(domain, database as string);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getDomainRank', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getTrafficStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { domain } = req.params;
    const { displayDate = '' } = req.query;

    if (!domain) {
      res.status(400).json({
        success: false,
        error: 'Domain is required',
      });
      return;
    }

    logger.info('Semrush get traffic stats request', {
      correlationId: req.headers['x-correlation-id'] as string,
      domain,
      displayDate,
    });

    const result = await semrushService.getTrafficStats(domain, displayDate as string);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getTrafficStats', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getKeywordResearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { keyword } = req.query;
    const { database = 'us' } = req.query;

    if (!keyword || typeof keyword !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Keyword is required',
      });
      return;
    }

    logger.info('Semrush keyword research request', {
      correlationId: req.headers['x-correlation-id'] as string,
      keyword,
      database,
    });

    const result = await semrushService.getKeywordResearch(keyword, database as string);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getKeywordResearch', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
