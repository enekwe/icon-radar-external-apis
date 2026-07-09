import { Request, Response, NextFunction } from 'express';
import { logger } from '@enekwe/icon-radar-shared';

export function requireServiceAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-service-api-key'] as string;

  if (!apiKey) {
    logger.warn('Service authentication failed: Missing API key', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(401).json({
      success: false,
      error: 'Service API key required',
    });
    return;
  }

  if (apiKey !== process.env.SERVICE_API_KEY) {
    logger.warn('Service authentication failed: Invalid API key', {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(403).json({
      success: false,
      error: 'Invalid service API key',
    });
    return;
  }

  logger.debug('Service authenticated successfully', {
    path: req.path,
    method: req.method,
  });

  next();
}
