import { Request, Response } from 'express';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  findGuideByUserId,
  findGuideByIdNumber,
  findAllGuides,
  createGuide,
  updateGuide,
  GUIDE_SCOPE,
  GUIDE_STATUS,
  CreateGuideDTO,
  UpdateGuideDTO
} from '../models/guide.model.js';
import { GuideService } from '../services/guide.service.js';
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

    // Public API: Force status=ONLINE
    const { guides, total } = await findAllGuides(
        page, 
        pageSize, 
        city, 
        keyword, 
        lat, 
        lng, 
        GUIDE_STATUS.ONLINE, // V2.2: Explicit status filter
        GUIDE_SCOPE.PUBLIC
    );

    // Enrich guides (Batch)
    const enrichedGuides = await GuideService.enrichGuides(guides);

    const list = enrichedGuides.map(g => ({
          userId: g.userId,
          stageName: g.stageName || g.userNickName || '匿名地陪', 
          nickName: g.userNickName || '匿名用户', 
          city: g.city,
          intro: g.intro ? g.intro.substring(0, 100) : '', 
          tags: g.tags,
          price: g.realPrice, 
          avatarUrl: g.avatarUrl || '', // From enrichment
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

    // Public Scope
    const guide = await findGuideByUserId(userId, GUIDE_SCOPE.PUBLIC);
    if (!guide) {
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪不存在');
      return;
    }
    
    // V2.2: Ensure status is ONLINE for public access
    // Although findAllGuides filters by status, findGuideByUserId doesn't enforce it by default unless we add logic there too.
    // For now, check manually or let it be (if direct link access is allowed).
    // Requirement says "is_online" controls visibility. So we should check.
    if (guide.status !== GUIDE_STATUS.ONLINE) {
        errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪未上架'); // Treat as not found
        return;
    }

    // Enrich guide
    const enriched = await GuideService.enrichGuide(guide);

    const response = {
      userId: enriched.userId,
      stageName: enriched.stageName || enriched.userNickName || '匿名地陪',
      nickName: enriched.userNickName || '匿名用户',
      city: enriched.city,
      intro: enriched.intro,
      price: enriched.realPrice || 0, // Public sees Real Price
      expectedPrice: enriched.expectedPrice || 0, // Optional
      tags: enriched.tags,
      photos: enriched.photos, // From enrichment {id, url}[]
      avatarUrl: enriched.avatarUrl, // From enrichment
      createdAt: enriched.createdAt,
      latitude: enriched.latitude ? Number(enriched.latitude) : undefined,
      longitude: enriched.longitude ? Number(enriched.longitude) : undefined,
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
      realName, // V2.1 New
      idNumber, // V2.1 New (Editable)
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

    const currentGuide = await findGuideByUserId(user.id, GUIDE_SCOPE.FULL); // Need full access

    if (currentGuide) {
      // Update
      const updateData: UpdateGuideDTO = {
        stageName: stageName || currentGuide.stageName,
        idNumber: idNumber || currentGuide.idNumber,
        city: city || currentGuide.city,
        intro: intro || null,
        expectedPrice: expectedPrice || null,
        tags: tags || null,
        photoIds: safePhotoIds.length > 0 ? safePhotoIds : null,
        address: address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        avatarId: avatarId ? Number(avatarId) : null,
        realName: realName || currentGuide.realName
      };
      
      await updateGuide(user.id, updateData);
    } else {
      // Create
      const nameToSave = stageName || user.nickname || `User${user.id}`;
      const idToSave = idNumber || `PENDING_ID_${user.id}`;
      const cityToSave = city || "未知";

      const createData: CreateGuideDTO = {
        userId: user.id,
        stageName: nameToSave,
        idNumber: idToSave,
        city: cityToSave,
        intro: intro || null,
        expectedPrice: expectedPrice || null,
        tags: tags || null,
        photoIds: safePhotoIds.length > 0 ? safePhotoIds : null,
        address: address || null,
        latitude: latitude || null,
        longitude: longitude || null,
        avatarId: avatarId ? Number(avatarId) : null,
        realName: realName || null,
        status: GUIDE_STATUS.OFFLINE // Default
      };

      await createGuide(createData);
    }

    // Return the guideId (and other essential info)
    const updatedGuide = await findGuideByUserId(user.id, GUIDE_SCOPE.FULL);
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

    const guide = await findGuideByUserId(user.id, GUIDE_SCOPE.FULL); // Owner sees everything

    if (!guide) {
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪信息不存在');
      return;
    }

    // Enrich guide
    const enriched = await GuideService.enrichGuide(guide);

    const response = {
      userId: enriched.userId,
      stageName: enriched.stageName,
      realName: enriched.realName, // V2.1
      idNumber: enriched.idNumber,
      city: enriched.city,
      address: enriched.address,
      intro: enriched.intro,
      realPrice: enriched.realPrice, // Show verified price
      expectedPrice: enriched.expectedPrice, // Show my input price
      tags: enriched.tags,
      photos: enriched.photos, // Now returns {id, url}[]
      avatarUrl: enriched.avatarUrl,
      avatarId: enriched.avatarId,
      idVerifiedAt: enriched.idVerifiedAt,
      latitude: enriched.latitude ? Number(enriched.latitude) : undefined,
      longitude: enriched.longitude ? Number(enriched.longitude) : undefined,
    };

    successResponse(res, response);
  } catch (error) {
    console.error('获取地陪资料失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}
