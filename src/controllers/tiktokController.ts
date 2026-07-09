import { Request, Response } from 'express';
import { logger } from '@icon-radar/shared';
import { tiktokService } from '../services/tiktokService';

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required',
      });
      return;
    }

    logger.info('TikTok get user request', {
      correlationId: req.headers['x-correlation-id'] as string,
      username,
    });

    const result = await tiktokService.getUser(username);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getUser', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getUserVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const { maxCount = '20' } = req.query;

    if (!username) {
      res.status(400).json({
        success: false,
        error: 'Username is required',
      });
      return;
    }

    logger.info('TikTok get user videos request', {
      correlationId: req.headers['x-correlation-id'] as string,
      username,
      maxCount,
    });

    const result = await tiktokService.getUserVideos(username, parseInt(maxCount as string, 10));

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getUserVideos', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getVideoAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      res.status(400).json({
        success: false,
        error: 'Video ID is required',
      });
      return;
    }

    logger.info('TikTok get video analytics request', {
      correlationId: req.headers['x-correlation-id'] as string,
      videoId,
    });

    const result = await tiktokService.getVideoAnalytics(videoId);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getVideoAnalytics', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
