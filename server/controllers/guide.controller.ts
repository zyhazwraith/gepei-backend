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

    // Filter Verified Only (Business Rule) - MOVED TO MODEL
    // const verifiedGuides = guides.filter(g => g.realPrice && g.realPrice > 0);
    const verifiedGuides = guides;

    // Batch resolve avatars
    // 1. Collect non-null avatar IDs directly from guide objects
    const avatarIds = verifiedGuides
      .map(g => g.avatarId)
      .filter((id): id is number => id !== null && id !== undefined);
      
    // 2. Resolve URLs for these avatar IDs
    const avatarMap = new Map<number, string>();
    if (avatarIds.length > 0) {
       const resolved = await resolvePhotoUrls(avatarIds);
       resolved.forEach(p => avatarMap.set(p.id, p.url));
    }
    
    const list = verifiedGuides.map(g => ({
          userId: g.userId,
          stageName: g.stageName || g.userNickName || '匿名地陪', 
          nickName: g.userNickName || '匿名用户', 
          city: g.city,
          intro: g.intro ? g.intro.substring(0, 100) : '', 
          tags: g.tags,
          price: g.realPrice, 
          avatarUrl: (g.avatarId && avatarMap.has(g.avatarId)) ? avatarMap.get(g.avatarId)! : '', 
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
    const userId = parseInt(req.params.id); // guideId -> userId
    if (isNaN(userId)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '无效的地陪ID');
      return;
    }

    const guide = await findGuideByUserId(userId);
    if (!guide) {
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪不存在');
      return;
    }

    // Resolve Photos
    const photoIds = (guide.photoIds || []) as number[];
    const photos = await resolvePhotoUrls(photoIds);
    
    // Resolve Avatar
    let avatarUrl = '';
    if (guide.avatarId) {
        const resolved = await resolvePhotoUrls([guide.avatarId]);
        if (resolved.length > 0) {
            avatarUrl = resolved[0].url;
        }
    }

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
      avatarUrl: avatarUrl,
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
      avatarId,
    } = req.body;

    const safePhotoIds = (photoIds && Array.isArray(photoIds)) ? photoIds : [];

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
        longitude || null,
        avatarId ? Number(avatarId) : null
      );
    } else {
      // Create
      const nameToSave = stageName || user.nickname || `User${user.id}`;
      const idToSave = `PENDING_ID_${user.id}`;
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
        longitude || null,
        avatarId ? Number(avatarId) : null
      );
    }

    // Return the guideId (and other essential info)
    const updatedGuide = await findGuideByUserId(user.id);
    successResponse(res, { 
      message: '更新成功',
      userId: user.id, // guideId -> userId
      data: updatedGuide
    });

  } catch (error) {
    console.error('更新地陪资料失败:', error);
    if (error instanceof Error) {
        console.error('Error stack:', error.stack);
    }
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

    // Resolve photos
    const photos = await resolvePhotoUrls((guide.photoIds || []) as number[]);
    
    // Resolve Avatar
    let avatarUrl = '';
    let avatarId = guide.avatarId;
    if (guide.avatarId) {
        const resolved = await resolvePhotoUrls([guide.avatarId]);
        if (resolved.length > 0) {
            avatarUrl = resolved[0].url;
        }
    }

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
      photos: photos, // Now returns {id, url}[]
      avatarUrl: avatarUrl,
      avatarId: avatarId,
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
