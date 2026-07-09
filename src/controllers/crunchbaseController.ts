import { Request, Response } from 'express';
import { logger } from '@enekwe/icon-radar-shared';
import { crunchbaseService } from '../services/crunchbaseService';
import { z } from 'zod';

const SearchOrganizationsSchema = z.object({
  query: z.string().min(1),
  fieldIds: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const SearchPeopleSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).optional(),
});

export const searchOrganizations = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = SearchOrganizationsSchema.parse(req.body);

    logger.info('Crunchbase search organizations request', {
      correlationId: req.headers['x-correlation-id'] as string,
      query: validated.query,
    });

    const result = await crunchbaseService.searchOrganizations(validated);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in searchOrganizations', {
        errors: error.errors,
      });
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    logger.error('Error in searchOrganizations', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const getOrganization = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Organization ID is required',
      });
      return;
    }

    logger.info('Crunchbase get organization request', {
      correlationId: req.headers['x-correlation-id'] as string,
      organizationId: id,
    });

    const result = await crunchbaseService.getOrganization(id);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    logger.error('Error in getOrganization', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

export const searchPeople = async (req: Request, res: Response): Promise<void> => {
  try {
    const validated = SearchPeopleSchema.parse(req.body);

    logger.info('Crunchbase search people request', {
      correlationId: req.headers['x-correlation-id'] as string,
      query: validated.query,
    });

    const result = await crunchbaseService.searchPeople(validated.query, validated.limit);

    res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in searchPeople', {
        errors: error.errors,
      });
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    logger.error('Error in searchPeople', {
      error: error instanceof Error ? error : new Error('Unknown error'),
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};
