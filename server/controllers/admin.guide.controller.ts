import { Request, Response } from 'express';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { AdminGuideService } from '../services/admin.guide.service.js';

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
    const status = req.query.status as string;

    const result = await AdminGuideService.listGuides({
      page,
      pageSize,
      city,
      keyword,
      status
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
    if (isNaN(userId)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, 'Invalid User ID');
      return;
    }

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
 * Admin Update Guide Status & Price
 * PUT /api/v1/admin/guides/:userId
 */
export async function updateGuideStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = parseInt(req.params.userId);
    const { is_guide, real_price } = req.body;

    if (isNaN(userId)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, 'Invalid User ID');
      return;
    }

    if (is_guide === undefined && real_price === undefined) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, 'At least one field (is_guide, real_price) is required');
      return;
    }

    const updated = await AdminGuideService.updateGuideStatus(userId, {
      isGuide: is_guide,
      realPrice: real_price
    });

    if (!updated) {
        errorResponse(res, ErrorCodes.USER_NOT_FOUND, 'User not found');
        return;
    }

    successResponse(res, updated);

  } catch (error) {
    console.error('Admin update guide failed:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}
