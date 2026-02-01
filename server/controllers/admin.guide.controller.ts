import { Request, Response } from 'express';
import { db } from '../db';
import { users, guides } from '../db/schema';
import { eq, sql, desc, count, getTableColumns, isNull } from 'drizzle-orm';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { findAllGuides, findGuideByUserId, resolvePhotoUrls } from '../models/guide.model.js';

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
    const status = req.query.status as string; // 'all' | 'verified' | 'pending'

    // We reuse findAllGuides but set onlyVerified = false
    // Note: findAllGuides doesn't support 'pending' filter natively yet,
    // but it returns 'isGuide' field, so frontend can filter visually or we improve model later.
    // For now, let's fetch all and filter if needed, OR improve model?
    // Improving model is better but let's stick to simple reuse first.
    // Actually, findAllGuides(..., false) returns ALL.
    
    // TODO: Improve findAllGuides to accept 'status' filter if needed for performance.
    
    const { guides: list, total } = await findAllGuides(page, pageSize, city, keyword, undefined, undefined, false);

    successResponse(res, {
      list,
      pagination: {
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize)
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

    const guide = await findGuideByUserId(userId);
    if (!guide) {
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, 'Guide not found');
      return;
    }

    // Need to fetch user info (isGuide, realName, etc) if not fully in guide object
    // findGuideByUserId already joins users table but check what it returns.
    // It returns mapDbRowToGuide result.
    // We need 'isGuide' which is in users table.
    // findGuideByUserId implementation:
    // .leftJoin(users, ...).select({...guides, userNickName: users.nickname})
    // It does NOT select isGuide.
    
    // So we need a separate query or modify findGuideByUserId.
    // Let's do a specific query here for Admin to get everything.
    
    const [fullProfile] = await db
      .select({
        ...getTableColumns(guides),
        userNickName: users.nickname,
        isGuide: users.isGuide,
        userPhone: users.phone, // Sensitive
      })
      .from(guides)
      .leftJoin(users, eq(guides.userId, users.id))
      .where(eq(guides.userId, userId))
      .limit(1);

    if (!fullProfile) {
        errorResponse(res, ErrorCodes.USER_NOT_FOUND, 'Guide not found');
        return;
    }

    // Parse JSON
    const tags = typeof fullProfile.tags === 'string' ? JSON.parse(fullProfile.tags) : fullProfile.tags;
    const photoIds = typeof fullProfile.photoIds === 'string' ? JSON.parse(fullProfile.photoIds) : fullProfile.photoIds;

    // Resolve Photos
    const photoObjects = await resolvePhotoUrls(photoIds as number[]);
    const photos = photoObjects.map(p => p.url);

    successResponse(res, {
        ...fullProfile,
        // Ensure numbers are numbers
        expectedPrice: fullProfile.expectedPrice ? Number(fullProfile.expectedPrice) : 0,
        realPrice: fullProfile.realPrice ? Number(fullProfile.realPrice) : 0,
        latitude: fullProfile.latitude ? Number(fullProfile.latitude) : null,
        longitude: fullProfile.longitude ? Number(fullProfile.longitude) : null,
        tags,
        photoIds,
        photos,
        photoObjects
    });

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

    // Transaction to update both tables
    await db.transaction(async (tx) => {
      // 1. Update User Status (is_guide)
      if (is_guide !== undefined) {
        await tx.update(users)
          .set({ isGuide: is_guide })
          .where(eq(users.id, userId));
        
        // If enabling guide, ensure idVerifiedAt is set (if not already)
        if (is_guide === true) {
           await tx.update(guides)
             .set({ 
                idVerifiedAt: sql`IF(id_verified_at IS NULL, NOW(), id_verified_at)` 
             })
             .where(eq(guides.userId, userId));
        }
      }

      // 2. Update Guide Price (real_price)
      if (real_price !== undefined) {
        // Ensure guide record exists first (it should, if they applied)
        // If not, we can't set price.
        await tx.update(guides)
          .set({ realPrice: real_price })
          .where(eq(guides.userId, userId));
      }
    });

    // Fetch updated data for response
    const updatedGuide = await db.select({
      userId: users.id,
      isGuide: users.isGuide,
      realPrice: guides.realPrice,
      idVerifiedAt: guides.idVerifiedAt,
      expectedPrice: guides.expectedPrice,
      stageName: guides.stageName // Fixed: name -> stageName
    })
    .from(users)
    .leftJoin(guides, eq(users.id, guides.userId))
    .where(eq(users.id, userId))
    .limit(1);

    if (updatedGuide.length === 0) {
        errorResponse(res, ErrorCodes.USER_NOT_FOUND, 'User not found');
        return;
    }

    successResponse(res, updatedGuide[0]);

  } catch (error) {
    console.error('Admin update guide failed:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}
