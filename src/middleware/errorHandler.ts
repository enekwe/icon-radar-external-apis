import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Custom error class with status code
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isOperational = err instanceof AppError ? err.isOperational : false;

  // Log error
  logger.error('Error occurred', {
    correlationId: req.correlationId,
    error: err.message,
    stack: err.stack,
    statusCode,
    isOperational,
    method: req.method,
    url: req.url,
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
  });
};

export default errorHandler;
