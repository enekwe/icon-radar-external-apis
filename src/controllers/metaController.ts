import { Request, Response } from 'express';
import { logger } from '@enekwe/icon-radar-shared';
import { metaService } from '../services/metaService';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required',
      });
      return;
    }

    logger.info('Meta get profile request', {
      correlationId: req.headers['x-correlation-id'] as string,
      username,
    });

    const result = await metaService.getProfile(username);

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

export const getInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const { period = 'day' } = req.query;

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required',
      });
      return;
    }

    logger.info('Meta get insights request', {
      correlationId: req.headers['x-correlation-id'] as string,
      username,
      period,
    });

    const result = await metaService.getInsights(username, period as string);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getInsights', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mediaId } = req.params;

    if (!mediaId) {
      res.status(400).json({
        success: false,
        error: 'Media ID is required',
      });
      return;
    }

    logger.info('Meta get media request', {
      correlationId: req.headers['x-correlation-id'] as string,
      mediaId,
    });

    const result = await metaService.getMedia(mediaId);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getMedia', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getUserMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const { limit = '25' } = req.query;

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required',
      });
      return;
    }

    logger.info('Meta get user media request', {
      correlationId: req.headers['x-correlation-id'] as string,
      username,
      limit,
    });

    const result = await metaService.getUserMedia(username, parseInt(limit as string, 10));

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getUserMedia', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
