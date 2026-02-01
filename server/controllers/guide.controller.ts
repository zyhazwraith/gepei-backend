import { Request, Response } from 'express';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  findGuideByUserId,
  findGuideByIdNumber,
  findAllGuides,
  createGuide,
  updateGuide,
  resolvePhotoUrls,
} from '../models/guide.model.js';

/**
 * 获取地陪列表（公开接口）
 * GET /api/v1/guides
 * 
 * Spec V2:
 * - Query: page, page_size, city, keyword, lat, lng
 * - Response: Lightweight guide info for list view.
 */
export async function getGuides(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 20;
    const city = req.query.city as string;
    const keyword = req.query.keyword as string;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    const { guides, total } = await findAllGuides(page, pageSize, city, keyword, lat, lng);

    // Map DB fields to Response fields
    // Only return necessary fields for list view
    const list = guides.map(g => ({
      userId: g.userId,
      stageName: g.stageName || g.userNickName || '匿名地陪', 
      nickName: g.userNickName || '匿名用户', 
      city: g.city,
      intro: g.intro ? g.intro.substring(0, 100) : '', // Truncate intro for list
      tags: g.tags,
      expectedPrice: g.expectedPrice || 0,
      avatarUrl: '', // TODO: Resolve avatar URL from user's avatarId if needed
      distance: g.distance !== undefined ? Number(g.distance.toFixed(2)) : undefined,
    }));

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
    console.error('获取地陪列表失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * 获取地陪详情（公开接口）
 * GET /api/v1/guides/:id
 * 
 * Spec V2:
 * - Response: Full guide profile including resolved photo URLs.
 */
export async function getGuideDetail(req: Request, res: Response): Promise<void> {
  try {
    const guideId = parseInt(req.params.id);
    if (isNaN(guideId)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '无效的地陪ID');
      return;
    }

    const guide = await findGuideByUserId(guideId);
    if (!guide) {
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪不存在');
      return;
    }

    // Resolve Photos (ID -> {id, url})
    const photoIds = (guide.photoIds || []) as number[];
    const photos = await resolvePhotoUrls(photoIds);

    const response = {
      userId: guide.userId,
      stageName: guide.stageName || guide.userNickName || '匿名地陪',
      nickName: guide.userNickName || '匿名用户',
      city: guide.city,
      intro: guide.intro,
      expectedPrice: guide.expectedPrice || 0,
      tags: guide.tags,
      photos: photos, // Return full objects {id, url}
      createdAt: guide.createdAt,
      latitude: guide.latitude ? Number(guide.latitude) : undefined,
      longitude: guide.longitude ? Number(guide.longitude) : undefined,
    };

    successResponse(res, response);
  } catch (error) {
    console.error('获取地陪详情失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * 更新地陪资料
 * PUT /api/v1/guides/profile
 * 
 * Spec V2:
 * - Input: Clean fields, NO idNumber.
 * - Photos: Accepts `photoIds` (number[]) only.
 */
export async function updateGuideProfile(req: Request, res: Response): Promise<void> {
  try {
    // @ts-ignore - user is attached by auth middleware
    const user = req.user;
    if (!user) {
      errorResponse(res, ErrorCodes.TOKEN_INVALID);
      return;
    }

    const {
      stageName, 
      city,
      photoIds, 
      expectedPrice, 
      intro,
      tags,
      latitude,
      longitude,
      address, 
    } = req.body;

    // Basic Validation
    if (latitude !== undefined && (isNaN(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90)) {
       errorResponse(res, ErrorCodes.INVALID_PARAMS, '无效的纬度');
       return;
    }
    if (longitude !== undefined && (isNaN(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
       errorResponse(res, ErrorCodes.INVALID_PARAMS, '无效的经度');
       return;
    }
    if (expectedPrice !== undefined && (isNaN(Number(expectedPrice)) || Number(expectedPrice) < 0)) {
       errorResponse(res, ErrorCodes.INVALID_PARAMS, '期望价格必须为非负数');
       return;
    }

    // Ensure photoIds is an array of numbers
    const safePhotoIds = (Array.isArray(photoIds) ? photoIds : []).map((id: any) => Number(id)).filter((id: number) => !isNaN(id));

    // Check Existence
    const currentGuide = await findGuideByUserId(user.id);

    // Note: idNumber logic is removed from Spec V2.
    // We use empty string for DB persistence to satisfy NOT NULL constraints if any,
    // but we do NOT accept it from frontend.

    let guideId: number;

    if (currentGuide) {
      // Update
      await updateGuide(
        user.id,
        stageName || currentGuide.stageName,
        currentGuide.idNumber, // Keep existing ID number in DB (do not update)
        city || currentGuide.city,
        intro || null,
        expectedPrice || null,
        tags || null,
        safePhotoIds.length > 0 ? safePhotoIds : null,
        address || null, 
        latitude || null,
        longitude || null
      );
      guideId = currentGuide.userId;
    } else {
      // Create
      const nameToSave = stageName || user.nickname || `User${user.id}`;
      const idToSave = ""; // Placeholder for DB constraint
      const cityToSave = city || "未知";

      guideId = await createGuide(
        user.id,
        nameToSave,
        idToSave,
        cityToSave,
        intro || null,
        expectedPrice || null,
        tags || null,
        safePhotoIds.length > 0 ? safePhotoIds : null,
        address || null, 
        latitude || null,
        longitude || null
      );
    }

    // Return Updated Profile
    const updatedGuide = await findGuideByUserId(user.id);
    if (!updatedGuide) {
      errorResponse(res, ErrorCodes.INTERNAL_ERROR, '地陪信息更新失败');
      return;
    }

    // Resolve Photos for Response
    const resolvedPhotos = await resolvePhotoUrls((updatedGuide.photoIds || []) as number[]);

    const response = {
      userId: updatedGuide.userId,
      stageName: updatedGuide.stageName,
      // idNumber: updatedGuide.idNumber, // Removed from V2 Response
      city: updatedGuide.city,
      address: updatedGuide.address,
      intro: updatedGuide.intro,
      expectedPrice: updatedGuide.expectedPrice, 
      tags: updatedGuide.tags,
      photos: resolvedPhotos,
      idVerifiedAt: updatedGuide.idVerifiedAt,
      latitude: updatedGuide.latitude ? Number(updatedGuide.latitude) : undefined,
      longitude: updatedGuide.longitude ? Number(updatedGuide.longitude) : undefined,
    };

    successResponse(res, response);
  } catch (error: any) {
    console.error('更新地陪资料失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * 获取当前用户的地陪资料
 * GET /api/v1/guides/profile
 */
export async function getGuideProfile(req: Request, res: Response): Promise<void> {
  try {
    // @ts-ignore
    const user = req.user;
    if (!user) {
      errorResponse(res, ErrorCodes.TOKEN_INVALID);
      return;
    }

    const guide = await findGuideByUserId(user.id);

    if (!guide) {
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪信息不存在');
      return;
    }

    // Resolve photos
    const photos = await resolvePhotoUrls((guide.photoIds || []) as number[]);

    const response = {
      userId: guide.userId,
      stageName: guide.stageName,
      // idNumber: guide.idNumber, // Removed from V2 Response
      city: guide.city,
      intro: guide.intro,
      expectedPrice: guide.expectedPrice,
      tags: guide.tags,
      photos: photos, // [{id, url}]
      idVerifiedAt: guide.idVerifiedAt,
      latitude: guide.latitude ? Number(guide.latitude) : undefined,
      longitude: guide.longitude ? Number(guide.longitude) : undefined,
    };

    successResponse(res, response);
  } catch (error) {
    console.error('获取地陪资料失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}
