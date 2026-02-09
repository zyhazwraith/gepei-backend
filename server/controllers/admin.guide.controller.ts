import { Request, Response } from 'express';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AdminGuideService } from '../services/admin.guide.service.js';
import { AppError } from '../utils/errors.js';
import { createGuideSchema, updateGuideSchema } from '../schemas/guide.schema.js';
import { ZodError } from 'zod';

/**
 * Admin Get Guide List
 * GET /api/v1/admin/guides
 */
export async function listGuides(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 20;
    const city = req.query.city as string;
    const keyword = req.query.keyword as string;
    
    // Parse isGuide param (camelCase enforced in query too?)
    // Query params are usually handled manually, but let's keep it consistent.
    let isGuide: boolean | undefined = undefined;
    if (req.query.isGuide === 'true') isGuide = true;
    if (req.query.isGuide === 'false') isGuide = false;
    // Fallback for snake_case during transition if needed, but we said "No Compatibility"
    // But query params are less strict than body. Let's stick to camelCase `isGuide`.

    const result = await AdminGuideService.listGuides({
      page,
      pageSize,
      city,
      keyword,
      isGuide
    });

    successResponse(res, {
      list: result.list,
      pagination: {
        total: result.pagination.total,
        page: result.pagination.page,
        page_size: result.pagination.pageSize,
        total_pages: result.pagination.totalPages
      }
    });
  } catch (error) {
    console.error('Admin list guides failed:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Admin Get Guide Detail
 * GET /api/v1/admin/guides/:userId
 */
export async function getGuideDetail(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.userId);

    const guide = await AdminGuideService.getGuideDetail(userId);

    if (!guide) {
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, 'Guide not found');
      return;
    }

    successResponse(res, guide);
  } catch (error) {
    console.error('Admin get guide detail failed:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * Admin Create Guide Profile
 * POST /api/v1/admin/guides
 */
export async function createGuide(req: Request, res: Response): Promise<void> {
    try {
        // Zod Validation
        const validation = createGuideSchema.safeParse(req.body);
        
        if (!validation.success) {
            errorResponse(res, ErrorCodes.VALIDATION_ERROR, validation.error.message);
            return;
        }

        const data = validation.data;

        const result = await AdminGuideService.createGuideProfile({
            userId: data.userId,
            stageName: data.stageName,
            realName: data.realName,
            idNumber: data.idNumber,
            city: data.city,
            intro: data.intro || undefined, // undefined vs null handling in service/model
            expectedPrice: data.expectedPrice || undefined,
            realPrice: data.realPrice || undefined,
            tags: data.tags || undefined,
            photoIds: data.photoIds || undefined,
            address: data.address || undefined,
            latitude: data.latitude || undefined,
            longitude: data.longitude || undefined,
            avatarId: data.avatarId || undefined,
            isGuide: data.isGuide,
            status: data.status || undefined
        });

        successResponse(res, result);
    } catch (error) {
        console.error('Admin create guide failed:', error);
        if (error instanceof AppError) {
            errorResponse(res, error.code, error.message, error.statusCode);
        } else {
            errorResponse(res, ErrorCodes.INTERNAL_ERROR);
        }
    }
}

/**
 * Admin Update Guide Status & Profile
 * PUT /api/v1/admin/guides/:userId
 */
export async function updateGuide(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.userId);
    
    // Zod Validation
    const validation = updateGuideSchema.safeParse(req.body);
        
    if (!validation.success) {
        errorResponse(res, ErrorCodes.VALIDATION_ERROR, validation.error.message);
        return;
    }

    const data = validation.data;

    const updated = await AdminGuideService.updateGuideProfile(userId, {
      ...data,
      // Ensure nulls are handled if Zod returns null
      intro: data.intro || undefined,
      tags: data.tags || undefined,
      photoIds: data.photoIds || undefined,
      address: data.address || undefined,
      realName: data.realName || undefined,
      stageName: data.stageName || undefined,
      city: data.city || undefined,
      idNumber: data.idNumber || undefined,
      // Numbers
      realPrice: data.realPrice || undefined,
      expectedPrice: data.expectedPrice || undefined,
      latitude: data.latitude || undefined,
      longitude: data.longitude || undefined,
      avatarId: data.avatarId || undefined,
      status: data.status || undefined
    });

    if (!updated) {
        errorResponse(res, ErrorCodes.USER_NOT_FOUND, 'User not found');
        return;
    }

    successResponse(res, updated);

  } catch (error) {
    console.error('Admin update guide failed:', error);
    if (error instanceof AppError) {
        errorResponse(res, error.code, error.message, error.statusCode);
    } else {
        errorResponse(res, ErrorCodes.INTERNAL_ERROR);
    }
  }
}
