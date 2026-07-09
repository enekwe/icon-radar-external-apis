import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Middleware to log incoming requests and outgoing responses
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Log the incoming request
  logger.info('Incoming request', {
    correlationId: req.correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to log response
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;

    logger.info('Outgoing response', {
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });

    // Call the original end function
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};

export default requestLogger;
