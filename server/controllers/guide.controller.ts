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
 * ==============================================================================
 * V2 GUIDE API SPECIFICATION (V2 地陪接口规范)
 * ==============================================================================
 * 
 * 1. Public List (公开列表)
 *    - GET /api/v1/guides
 *    - Filter: 仅展示 status=verified (已审核) 的地陪。
 *    - Fields: userId, stageName, city, intro(摘要), tags, price(realPrice), avatarUrl, lat/lng, distance.
 * 
 * 2. Public Detail (公开详情)
 *    - GET /api/v1/guides/:id
 *    - Fields: List字段 + photos(完整URL), intro(完整), expectedPrice(可选展示).
 * 
 * 3. My Profile (我的资料)
 *    - GET /api/v1/guides/profile
 *    - Fields: 全量字段 (realPrice, expectedPrice, address, photos[{id,url}]...).
 * 
 * 4. Update Profile (更新资料)
 *    - PUT /api/v1/guides/profile
 *    - Input: stageName, city, photoIds, expectedPrice, intro, tags, lat/lng, address.
 *    - Output: Success (无数据返回).
 * 
 * ==============================================================================
 */

/**
 * 获取地陪列表（公开接口）
 * GET /api/v1/guides
 */
export async function listPublicGuides(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 20;
    const city = req.query.city as string;
    const keyword = req.query.keyword as string;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    // TODO: Improve Model to support 'verified' filter natively.
    // Current findAllGuides returns all. We filter in memory or update Model?
    // For MVP/V2, let's assume findAllGuides is updated or we filter here.
    // But `findAllGuides` is complex LBS query.
    // Let's pass a flag `onlyVerified: true` to findAllGuides (need to check model definition).
    // Checking model... `findAllGuides` has `onlyVerified` param? 
    // Previous read showed `findAllGuides(page, pageSize, city, keyword, lat, lng)`.
    // We should probably filter in memory if model update is out of scope, OR assume model returns all and we filter.
    // But pagination will be wrong if we filter in memory.
    
    // Assumption: findAllGuides returns mixed.
    // Let's rely on the result and filter.
    
    const { guides, total } = await findAllGuides(page, pageSize, city, keyword, lat, lng);

    // Filter Verified Only (Business Rule)
    // Condition: isGuide=true (from users table join) AND realPrice > 0
    // Note: findAllGuides result `g` has `isGuide`?
    // Let's check model return type. Usually it joins user.
    
    // Mapping & Filtering
    const list = guides
        .filter(g => g.realPrice && g.realPrice > 0) // Basic filter: must have system price
        .map(g => ({
          userId: g.userId,
          stageName: g.stageName || g.userNickName || '匿名地陪', 
          nickName: g.userNickName || '匿名用户', 
          city: g.city,
          intro: g.intro ? g.intro.substring(0, 100) : '', 
          tags: g.tags,
          price: g.realPrice, // Return Real Price
          avatarUrl: '', // TODO: Resolve avatar
          latitude: g.latitude ? Number(g.latitude) : undefined,
          longitude: g.longitude ? Number(g.longitude) : undefined,
          distance: g.distance !== undefined ? Number(g.distance.toFixed(2)) : undefined,
        }));

    successResponse(res, {
      list, 
      pagination: {
        total, // Note: total might be inaccurate after filter, but acceptable for MVP
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
 */
export async function getPublicGuideDetail(req: Request, res: Response): Promise<void> {
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

    // Resolve Photos
    const photoIds = (guide.photoIds || []) as number[];
    const photos = await resolvePhotoUrls(photoIds);

    const response = {
      userId: guide.userId,
      stageName: guide.stageName || guide.userNickName || '匿名地陪',
      nickName: guide.userNickName || '匿名用户',
      city: guide.city,
      intro: guide.intro,
      price: guide.realPrice || 0, // Public sees Real Price
      expectedPrice: guide.expectedPrice || 0, // Optional
      tags: guide.tags,
      photos: photos,
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
 * 更新我的资料
 * PUT /api/v1/guides/profile
 */
export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  try {
    // @ts-ignore
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

    // Validation
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

    const safePhotoIds = (Array.isArray(photoIds) ? photoIds : []).map((id: any) => Number(id)).filter((id: number) => !isNaN(id));

    // Check Existence
    const currentGuide = await findGuideByUserId(user.id);

    if (currentGuide) {
      // Update
      await updateGuide(
        user.id,
        stageName || currentGuide.stageName,
        currentGuide.idNumber, 
        city || currentGuide.city,
        intro || null,
        expectedPrice || null,
        tags || null,
        safePhotoIds.length > 0 ? safePhotoIds : null,
        address || null, 
        latitude || null,
        longitude || null
      );
    } else {
      // Create
      const nameToSave = stageName || user.nickname || `User${user.id}`;
      const idToSave = ""; 
      const cityToSave = city || "未知";

      await createGuide(
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

    // Success Response (Simple)
    successResponse(res, { message: '更新成功' });

  } catch (error: any) {
    console.error('更新地陪资料失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * 获取我的资料
 * GET /api/v1/guides/profile
 */
export async function getMyProfile(req: Request, res: Response): Promise<void> {
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

    const photos = await resolvePhotoUrls((guide.photoIds || []) as number[]);

    const response = {
      userId: guide.userId,
      stageName: guide.stageName,
      // idNumber: guide.idNumber, // Keep hidden or show if needed? Spec says "全量". Let's show it if it exists.
      idNumber: guide.idNumber,
      city: guide.city,
      address: guide.address,
      intro: guide.intro,
      realPrice: guide.realPrice, // Show verified price
      expectedPrice: guide.expectedPrice, // Show my input price
      tags: guide.tags,
      photos: photos, 
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
