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
import { db } from '../db/index.js';
import { users, attachments } from '../db/schema.js';
import { inArray, eq } from 'drizzle-orm';

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

    const { guides, total } = await findAllGuides(page, pageSize, city, keyword, lat, lng);

    // Filter Verified Only (Business Rule)
    const verifiedGuides = guides.filter(g => g.realPrice && g.realPrice > 0);

    // Batch resolve avatars
    // 1. Get all user IDs
    const userIds = verifiedGuides.map(g => g.userId);
    
    // 2. Fetch avatarIds from users table
    const userAvatars = userIds.length > 0 ? await db
      .select({ userId: users.id, avatarId: users.avatarId })
      .from(users)
      .where(inArray(users.id, userIds)) : [];
      
    // 3. Collect non-null avatar IDs
    const avatarIds = userAvatars
      .map(u => u.avatarId)
      .filter((id): id is number => id !== null);
      
    // 4. Resolve URLs for these avatar IDs
    const avatarMap = new Map<number, string>();
    if (avatarIds.length > 0) {
       const resolved = await resolvePhotoUrls(avatarIds);
       resolved.forEach(p => avatarMap.set(p.id, p.url));
    }
    
    // 5. Create UserId -> AvatarUrl Map
    const userAvatarUrlMap = new Map<number, string>();
    userAvatars.forEach(u => {
        if (u.avatarId && avatarMap.has(u.avatarId)) {
            userAvatarUrlMap.set(u.userId, avatarMap.get(u.avatarId)!);
        }
    });

    const list = verifiedGuides.map(g => ({
          userId: g.userId,
          stageName: g.stageName || g.userNickName || '匿名地陪', 
          nickName: g.userNickName || '匿名用户', 
          city: g.city,
          intro: g.intro ? g.intro.substring(0, 100) : '', 
          tags: g.tags,
          price: g.realPrice, 
          avatarUrl: userAvatarUrlMap.get(g.userId) || '', 
          latitude: g.latitude ? Number(g.latitude) : undefined,
          longitude: g.longitude ? Number(g.longitude) : undefined,
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
