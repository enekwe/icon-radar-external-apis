import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request type to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Middleware to add a correlation ID to each request
 * Uses existing X-Correlation-ID header or generates a new UUID
 */
export const correlationId = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
};

export default correlationId;
