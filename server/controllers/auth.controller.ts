import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { validatePhone, validatePassword } from '../utils/validation.js';
import { generateToken } from '../utils/jwt.js';
import { findUserByPhone, createUser } from '../models/user.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { RegisterRequest, LoginRequest, AuthResponse } from '../../shared/types.js';

/**
 * 用户注册
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { phone, password, nickname }: RegisterRequest = req.body;

    // 验证手机号格式
    if (!phone || !validatePhone(phone)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '手机号格式不正确');
      return;
    }

    // 验证密码格式（8-20位，包含字母和数字）
    if (!password || !validatePassword(password)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '密码必须为8-20位，包含字母和数字');
      return;
    }

    // 检查手机号是否已注册
    const existingUser = await findUserByPhone(phone);
    if (existingUser) {
      errorResponse(res, ErrorCodes.PHONE_EXISTS);
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const userId = await createUser(phone, hashedPassword, nickname);

    // 查询新创建的用户
    const newUser = await findUserByPhone(phone);
    if (!newUser) {
      errorResponse(res, ErrorCodes.INTERNAL_ERROR, '用户创建失败');
      return;
    }

    // 生成 Token
    const token = generateToken({
      userId: newUser.id,
      phone: newUser.phone,
      role: newUser.role,
    });

    // 返回响应（符合API设计文档）
    const authResponse: AuthResponse = {
      user_id: newUser.id,
      phone: newUser.phone,
      nickname: newUser.nickname || '',
      token,
      is_guide: newUser.is_guide,
    };

    successResponse(res, authResponse);
  } catch (error) {
    console.error('注册失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * 用户登录
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { phone, password }: LoginRequest = req.body;

    // 验证手机号格式
    if (!phone || !validatePhone(phone)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '手机号格式不正确');
      return;
    }

    // 验证密码格式
    if (!password || !validatePassword(password)) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, '密码格式不正确');
      return;
    }

    // 查找用户
    const user = await findUserByPhone(phone);
    if (!user) {
      errorResponse(res, ErrorCodes.INVALID_CREDENTIALS);
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      errorResponse(res, ErrorCodes.INVALID_CREDENTIALS);
      return;
    }

    // 生成 Token
    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      role: user.role,
    });

    // 返回响应（符合API设计文档）
    const authResponse: AuthResponse = {
      user_id: user.id,
      phone: user.phone,
      nickname: user.nickname || '',
      token,
      is_guide: user.is_guide,
    };

    successResponse(res, authResponse);
  } catch (error) {
    console.error('登录失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * 获取当前用户信息
 * GET /api/v1/auth/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    // @ts-ignore - user is attached by auth middleware
    const user = req.user;

    if (!user) {
      errorResponse(res, ErrorCodes.TOKEN_INVALID);
      return;
    }

    // 返回用户信息
    const userInfo = {
      user_id: user.id,
      phone: user.phone,
      nickname: user.nickname || '',
      avatar_url: user.avatar_url || '',
      role: user.role,
      is_guide: user.is_guide,
      balance: user.balance,
    };

    successResponse(res, userInfo);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}
