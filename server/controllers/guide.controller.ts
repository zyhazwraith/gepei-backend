import { Request, Response } from 'express';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { validateIdNumber } from '../utils/idValidator.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  findGuideByUserId,
  findGuideByIdNumber,
  findGuideById,
  findAllGuides,
  createGuide,
  updateGuide,
  updateUserIsGuide,
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

    const { guides, total } = await findAllGuides(page, pageSize, city, keyword);

    // 转换为前端友好的格式（隐藏敏感信息）
    const list = guides.map(g => ({
      guideId: g.id,
      userId: g.user_id,
      nickName: g.name, // 对应 Guide 表的 name 字段 (用户设置的昵称/显示名称)
      // 隐藏身份证号
      city: g.city,
      intro: g.intro,
      hourlyPrice: g.hourly_price,
      tags: g.tags,
      // photos: g.photos, // 列表页可能只需要第一张图
      avatarUrl: g.photos && Array.isArray(g.photos) && g.photos.length > 0 ? g.photos[0] : '', // 模拟头像
      rating: 4.8, // Mock
      reviewCount: 50, // Mock
      // tags: g.tags,
      // photos: g.photos,
      // created_at: g.created_at,
    }));

    successResponse(res, {
      list, // or items
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
export async function getGuideDetail(req: Request, res: Response): Promise<void> {
  try {
    const guideId = parseInt(req.params.id);
    if (isNaN(guideId)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '无效的地陪ID');
      return;
    }

    const guide = await findGuideById(guideId);

    if (!guide) {
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪不存在');
      return;
    }

    // 转换为前端友好的格式（隐藏敏感信息）
    const response = {
      guideId: guide.id,
      userId: guide.user_id,
      nickName: guide.name,
      city: guide.city,
      intro: guide.intro,
      hourlyPrice: guide.hourly_price,
      tags: guide.tags,
      photos: guide.photos,
      avatarUrl: guide.photos && Array.isArray(guide.photos) && guide.photos.length > 0 ? guide.photos[0] : '',
      rating: 4.8,
      reviewCount: 50,
      createdAt: guide.created_at,
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
      name,
      city,
      photos,
      hourlyPrice,
      intro,
      tags,
    } = req.body;

    // 验证必填字段
    if (!idNumber || !name || !city) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '身份证号、真实姓名和城市为必填项');
      return;
    }

    // 验证身份证号格式
    if (!validateIdNumber(idNumber)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '身份证号格式不正确');
      return;
    }

    // 验证小时价格
    if (hourlyPrice !== undefined && hourlyPrice !== null) {
      const price = Number(hourlyPrice);
      if (isNaN(price) || price < 0) {
        errorResponse(res, ErrorCodes.INVALID_PARAMS, '小时价格必须为非负数');
        return;
      }
    }

    // 验证照片数量（最多5张）
    if (photos && Array.isArray(photos) && photos.length > 5) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '照片最多上传5张');
      return;
    }

    // 查找当前用户的地陪信息
    const currentGuide = await findGuideByUserId(user.id);

    // 检查身份证号是否已被其他用户使用
    // 如果是更新操作且身份证号未改变，则跳过检查
    if (!currentGuide || currentGuide.id_number !== idNumber) {
      const existingGuide = await findGuideByIdNumber(idNumber);
      if (existingGuide && existingGuide.user_id !== user.id) {
        errorResponse(res, ErrorCodes.INVALID_PARAMS, '该身份证号已被使用');
        return;
      }
    }

    let guideId: number;

    if (currentGuide) {
      // 更新现有地陪信息
      await updateGuide(
        user.id,
        name,
        idNumber,
        city,
        intro || null,
        hourlyPrice || null,
        tags || null,
        photos || null
      );
      guideId = currentGuide.id;
    } else {
      // 创建新的地陪信息
      guideId = await createGuide(
        user.id,
        name,
        idNumber,
        city,
        intro || null,
        hourlyPrice || null,
        tags || null,
        photos || null
      );
    }

    // 更新用户的is_guide状态
    await updateUserIsGuide(user.id, true);

    // 查询更新后的地陪信息
    const updatedGuide = await findGuideByUserId(user.id);

    if (!updatedGuide) {
      errorResponse(res, ErrorCodes.INTERNAL_ERROR, '地陪信息更新失败');
      return;
    }

    // 返回响应
    const response = {
      guideId: updatedGuide.id,
      userId: updatedGuide.user_id,
      name: updatedGuide.name,
      idNumber: updatedGuide.id_number,
      city: updatedGuide.city,
      intro: updatedGuide.intro,
      hourlyPrice: updatedGuide.hourly_price,
      tags: updatedGuide.tags,
      photos: updatedGuide.photos,
      idVerifiedAt: updatedGuide.id_verified_at,
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

    // 返回响应
    const response = {
      guideId: guide.id,
      userId: guide.user_id,
      name: guide.name,
      idNumber: guide.id_number,
      city: guide.city,
      intro: guide.intro,
      hourlyPrice: guide.hourly_price,
      tags: guide.tags,
      photos: guide.photos,
      idVerifiedAt: guide.id_verified_at,
    };

    successResponse(res, response);
  } catch (error) {
    console.error('获取地陪资料失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}
