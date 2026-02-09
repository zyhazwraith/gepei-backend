import { Request, Response } from 'express';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AdminGuideService } from '../services/admin.guide.service.js';
import { AppError } from '../utils/errors.js';

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
    
    // Parse is_guide param directly
    let isGuide: boolean | undefined = undefined;
    if (req.query.is_guide === 'true') isGuide = true;
    if (req.query.is_guide === 'false') isGuide = false;

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
        const {
            userId,
            stageName,
            realName,
            idNumber,
            city,
            intro,
            expectedPrice,
            realPrice,
            tags,
            photoIds,
            address,
            latitude,
            longitude,
            avatarId,
            isGuide,
            status
        } = req.body;

        if (!userId || !stageName || !realName || !idNumber || !city) {
            errorResponse(res, ErrorCodes.INVALID_PARAMS, 'Missing required fields');
            return;
        }

        const result = await AdminGuideService.createGuideProfile({
            userId: Number(userId),
            stageName,
            realName,
            idNumber,
            city,
            intro,
            expectedPrice: expectedPrice ? Number(expectedPrice) : undefined,
            realPrice: realPrice ? Number(realPrice) : undefined,
            tags,
            photoIds,
            address,
            latitude: latitude ? Number(latitude) : undefined,
            longitude: longitude ? Number(longitude) : undefined,
            avatarId: avatarId ? Number(avatarId) : undefined,
            isGuide: isGuide,
            status: status
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
    // V2.2: Support full profile update
    const { 
        is_guide, 
        real_price, 
        status,
        stageName,
        realName,
        idNumber,
        city,
        intro,
        expectedPrice,
        tags,
        photoIds,
        address,
        latitude,
        longitude,
        avatarId
    } = req.body;

    const updated = await AdminGuideService.updateGuideProfile(userId, {
      isGuide: is_guide,
      realPrice: real_price,
      status: status,
      stageName,
      realName,
      idNumber,
      city,
      intro,
      expectedPrice,
      tags,
      photoIds,
      address,
      latitude,
      longitude,
      avatarId
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
