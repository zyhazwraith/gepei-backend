import { Request, Response } from 'express';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { validateIdNumber } from '../utils/idValidator.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  findGuideByUserId,
  findGuideByIdNumber,
  findAllGuides,
  createGuide,
  updateGuide,
  updateUserIsGuide,
  resolvePhotoUrls,
} from '../models/guide.model.js';

/**
 * 获取地陪列表（公开接口）
 * GET /api/v1/guides
 */
export async function getGuides(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.page_size as string) || 20;
    const city = req.query.city as string;
    const keyword = req.query.keyword as string;
    
    // LBS Params
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;

    const { guides, total } = await findAllGuides(page, pageSize, city, keyword, lat, lng);

    // 转换为前端友好的格式（隐藏敏感信息）
    const list = guides.map(g => ({
      guideId: g.userId, 
      userId: g.userId,
      stageName: g.stageName || g.userNickName || '匿名地陪', 
      nickName: g.userNickName || '匿名用户', 
      city: g.city,
      intro: g.intro,
      hourlyPrice: g.realPrice || g.expectedPrice || 0, // 优先展示真实价格
      tags: g.tags,
      photos: [], 
      avatarUrl: '', // Mock or empty
      rating: 4.8, // Mock
      reviewCount: 50, // Mock
      distance: g.distance !== undefined ? Number(g.distance.toFixed(2)) : undefined, // 保留2位小数
      latitude: g.latitude ? Number(g.latitude) : undefined,
      longitude: g.longitude ? Number(g.longitude) : undefined,
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
 * Note: :id here is interpreted as userId/guideId (PK)
 */
export async function getGuideDetail(req: Request, res: Response): Promise<void> {
  try {
    const guideId = parseInt(req.params.id);
    if (isNaN(guideId)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '无效的地陪ID');
      return;
    }

    // V2: findGuideByUserId IS findGuideById
    const guide = await findGuideByUserId(guideId);

    if (!guide) {
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪不存在');
      return;
    }

    // 转换为前端友好的格式
    const response = {
      guideId: guide.userId,
      userId: guide.userId,
      stageName: guide.stageName || guide.userNickName || '匿名地陪',
      nickName: guide.userNickName || '匿名用户',
      city: guide.city,
      intro: guide.intro,
      hourlyPrice: guide.realPrice || guide.expectedPrice || 0,
      tags: guide.tags,
      photos: [], // TODO: Resolve URLs from photoIds
      photoIds: guide.photoIds,
      avatarUrl: '',
      rating: 4.8,
      reviewCount: 50,
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
 * 更新地陪资料（包含认证逻辑）
 * PUT /api/v1/guides/profile
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
      idNumber,
      stageName, 
      city,
      photos, 
      photoIds, 
      hourlyPrice,
      expectedPrice, 
      intro,
      tags,
      latitude,
      longitude,
      address, 
      avatarId, 
    } = req.body;

    // 兼容逻辑：优先用 photoIds，如果没有则忽略 photos
    const finalPhotoIds = (Array.isArray(photoIds) ? photoIds : []) as number[];
    const finalPrice = expectedPrice !== undefined ? expectedPrice : hourlyPrice;

    console.log('Update Guide Profile:', { userId: user.id, latitude, longitude, address });

    // 验证经纬度
    if (latitude !== undefined && (isNaN(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90)) {
       errorResponse(res, ErrorCodes.INVALID_PARAMS, '无效的纬度');
       return;
    }
    if (longitude !== undefined && (isNaN(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)) {
       errorResponse(res, ErrorCodes.INVALID_PARAMS, '无效的经度');
       return;
    }

    // 验证身份证号格式 (Only if provided)
    if (idNumber && !validateIdNumber(idNumber)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '身份证号格式不正确');
      return;
    }

    // 验证价格 (mapped to expectedPrice)
    if (finalPrice !== undefined && finalPrice !== null) {
      const price = Number(finalPrice);
      if (isNaN(price) || price < 0) {
        errorResponse(res, ErrorCodes.INVALID_PARAMS, '小时价格必须为非负数');
        return;
      }
    }

    // 查找当前用户的地陪信息
    const currentGuide = await findGuideByUserId(user.id);

    // 检查身份证号是否已被其他用户使用 (Only if idNumber is provided)
    if (idNumber && (!currentGuide || currentGuide.idNumber !== idNumber)) {
      const existingGuide = await findGuideByIdNumber(idNumber);
      if (existingGuide && existingGuide.userId !== user.id) {
        errorResponse(res, ErrorCodes.INVALID_PARAMS, '该身份证号已被使用');
        return;
      }
    }

    let guideId: number;

    if (currentGuide) {
      // 更新
      const nameToSave = stageName || currentGuide.stageName;
      const idToSave = idNumber || currentGuide.idNumber;
      const cityToSave = city || currentGuide.city;

      await updateGuide(
        user.id,
        nameToSave,
        idToSave,
        cityToSave,
        intro || null,
        finalPrice || null, // Mapped to expectedPrice
        tags || null,
        finalPhotoIds.length > 0 ? finalPhotoIds : null,
        address || null, 
        latitude || null,
        longitude || null
      );
      
      guideId = currentGuide.userId;
    } else {
      // 创建
      const defaultName = user.nickname || `User${user.id}`;
      
      const nameToSave = stageName || defaultName;
      // We will try to pass empty string for ID if missing, and ensure validator skips if empty.
      const idToSave = idNumber || ""; 
      const cityToSave = city || "未知";

      guideId = await createGuide(
        user.id,
        nameToSave,
        idToSave,
        cityToSave,
        intro || null,
        finalPrice || null, // Mapped to expectedPrice
        tags || null,
        finalPhotoIds.length > 0 ? finalPhotoIds : null,
        address || null, 
        latitude || null,
        longitude || null
      );
    }

    // 查询更新后的地陪信息
    const updatedGuide = await findGuideByUserId(user.id);

    if (!updatedGuide) {
      errorResponse(res, ErrorCodes.INTERNAL_ERROR, '地陪信息更新失败');
      return;
    }

    // 返回响应
    const response = {
      guideId: updatedGuide.userId,
      userId: updatedGuide.userId,
      stageName: updatedGuide.stageName,
      idNumber: updatedGuide.idNumber,
      city: updatedGuide.city,
      address: updatedGuide.address,
      intro: updatedGuide.intro,
      expectedPrice: updatedGuide.expectedPrice, // V2
      hourlyPrice: updatedGuide.expectedPrice, // Backward compatibility
      realPrice: updatedGuide.realPrice,
      tags: updatedGuide.tags,
      photoIds: updatedGuide.photoIds,
      photos: [],
      idVerifiedAt: updatedGuide.idVerifiedAt,
      latitude: updatedGuide.latitude ? Number(updatedGuide.latitude) : undefined,
      longitude: updatedGuide.longitude ? Number(updatedGuide.longitude) : undefined,
    };

    successResponse(res, response);
  } catch (error: any) {
    console.error('更新地陪资料失败:', error);
    
    // 处理数据库唯一约束错误
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('id_number')) {
        errorResponse(res, ErrorCodes.INVALID_PARAMS, '该身份证号已被使用');
        return;
      }
      if (error.message.includes('user_id')) {
        errorResponse(res, ErrorCodes.INVALID_PARAMS, '您已经提交过地陪认证');
        return;
      }
    }
    
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}



/**
 * 获取当前用户的地陪资料
 * GET /api/v1/guides/profile
 */
export async function getGuideProfile(req: Request, res: Response): Promise<void> {
  try {
    // @ts-ignore - user is attached by auth middleware
    const user = req.user;

    if (!user) {
      errorResponse(res, ErrorCodes.TOKEN_INVALID);
      return;
    }

    // 查找地陪信息
    const guide = await findGuideByUserId(user.id);

    if (!guide) {
      // 这里的 1003 是 USER_NOT_FOUND，但我们不需要给前端返回错误
      // 而是返回一个空对象，表示"尚未认证"
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪信息不存在');
      return;
    }

    // Resolve photos
    // Note: resolvePhotoUrls is essential for hydrating the response with full photo objects (ID + URL)
    // which enables the frontend to display images correctly and maintain ID references for updates.
    const photoIds = (guide.photoIds || []) as number[];
    const photoObjects = await resolvePhotoUrls(photoIds);
    const photos = photoObjects.map(p => p.url);

    // 返回响应
    const response = {
      guideId: guide.userId,
      userId: guide.userId,
      stageName: guide.stageName,
      idNumber: guide.idNumber,
      city: guide.city,
      intro: guide.intro,
      expectedPrice: guide.expectedPrice, // 展示期望价格
      hourlyPrice: guide.expectedPrice, // Backward compatibility
      realPrice: guide.realPrice,
      tags: guide.tags,
      photoIds: guide.photoIds,
      photos: photos, // List of URLs
      photoObjects: photoObjects, // List of {id, url} for frontend editing
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
