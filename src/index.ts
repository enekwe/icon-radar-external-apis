import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger, correlationId, requestLogger, errorHandler } from '@icon-radar/shared';
import { apiRateLimiter } from './middleware/rateLimiter';
import crunchbaseRoutes from './routes/crunchbase';
import metaRoutes from './routes/meta';
import tiktokRoutes from './routes/tiktok';
import linkedinRoutes from './routes/linkedin';
import semrushRoutes from './routes/semrush';
import { crunchbaseService } from './services/crunchbaseService';
import { metaService } from './services/metaService';
import { tiktokService } from './services/tiktokService';
import { linkedinService } from './services/linkedinService';
import { semrushService } from './services/semrushService';

const app = express();
const PORT = process.env.PORT || 3008;
const SERVICE_NAME = process.env.SERVICE_NAME || 'external-apis';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(correlationId);
app.use(requestLogger);
app.use(apiRateLimiter);

// Health check endpoints
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

app.get('/health/ready', (req: Request, res: Response) => {
  const checks = {
    crunchbase: crunchbaseService.getCircuitBreakerStats(),
    meta: metaService.getCircuitBreakerStats(),
    tiktok: tiktokService.getCircuitBreakerStats(),
    linkedin: linkedinService.getCircuitBreakerStats(),
    semrush: semrushService.getCircuitBreakerStats(),
  };

  const allHealthy = Object.values(checks).every((check) => check.state !== 'OPEN');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'degraded',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    checks,
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

// API status endpoint
app.get('/api/v1/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    providers: {
      crunchbase: {
        circuitBreaker: crunchbaseService.getCircuitBreakerStats(),
        rateLimit: crunchbaseService.getRateLimitInfo(),
      },
      meta: {
        circuitBreaker: metaService.getCircuitBreakerStats(),
        rateLimit: metaService.getRateLimitInfo(),
      },
      tiktok: {
        circuitBreaker: tiktokService.getCircuitBreakerStats(),
        rateLimit: tiktokService.getRateLimitInfo(),
      },
      linkedin: {
        circuitBreaker: linkedinService.getCircuitBreakerStats(),
        rateLimit: linkedinService.getRateLimitInfo(),
      },
      semrush: {
        circuitBreaker: semrushService.getCircuitBreakerStats(),
        rateLimit: semrushService.getRateLimitInfo(),
      },
    },
  });
});

// API Routes
app.use('/api/v1/crunchbase', crunchbaseRoutes);
app.use('/api/v1/meta', metaRoutes);
app.use('/api/v1/tiktok', tiktokRoutes);
app.use('/api/v1/linkedin', linkedinRoutes);
app.use('/api/v1/semrush', semrushRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`${SERVICE_NAME} service started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export default app;
