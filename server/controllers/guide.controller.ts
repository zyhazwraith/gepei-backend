import { Request, Response } from 'express';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { validateIdNumber } from '../utils/idValidator.js';
import { successResponse, errorResponse } from '../utils/response.js';
import {
  findGuideByUserId,
  findGuideByIdNumber,
  createGuide,
  updateGuide,
  updateUserIsGuide,
} from '../models/guide.model.js';

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
      id_number,
      name,
      city,
      photos,
      hourly_price,
      intro,
      tags,
    } = req.body;

    // 验证必填字段
    if (!id_number || !name || !city) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '身份证号、真实姓名和城市为必填项');
      return;
    }

    // 验证身份证号格式
    if (!validateIdNumber(id_number)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '身份证号格式不正确');
      return;
    }

    // 验证小时价格
    if (hourly_price !== undefined && hourly_price !== null) {
      const price = Number(hourly_price);
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
    if (!currentGuide || currentGuide.id_number !== id_number) {
      const existingGuide = await findGuideByIdNumber(id_number);
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
        id_number,
        city,
        intro || null,
        hourly_price || null,
        tags || null,
        photos || null
      );
      guideId = currentGuide.id;
    } else {
      // 创建新的地陪信息
      guideId = await createGuide(
        user.id,
        name,
        id_number,
        city,
        intro || null,
        hourly_price || null,
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
      guide_id: updatedGuide.id,
      user_id: updatedGuide.user_id,
      name: updatedGuide.name,
      id_number: updatedGuide.id_number,
      city: updatedGuide.city,
      intro: updatedGuide.intro,
      hourly_price: updatedGuide.hourly_price,
      tags: updatedGuide.tags,
      photos: updatedGuide.photos,
      id_verified_at: updatedGuide.id_verified_at,
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
      errorResponse(res, ErrorCodes.USER_NOT_FOUND, '地陪信息不存在');
      return;
    }

    // 返回响应
    const response = {
      guide_id: guide.id,
      user_id: guide.user_id,
      name: guide.name,
      id_number: guide.id_number,
      city: guide.city,
      intro: guide.intro,
      hourly_price: guide.hourly_price,
      tags: guide.tags,
      photos: guide.photos,
      id_verified_at: guide.id_verified_at,
    };

    successResponse(res, response);
  } catch (error) {
    console.error('获取地陪资料失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}
