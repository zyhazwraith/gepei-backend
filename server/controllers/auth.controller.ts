import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod'; // Import zod
import { ErrorCodes } from '../../shared/errorCodes.js';
import { validatePhone, validatePassword } from '../utils/validation.js';
import { generateToken } from '../utils/jwt.js';
import { findUserByPhone, createUser } from '../models/user.model.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { RegisterRequest, LoginRequest, SendVerificationCodeRequest, ResetPasswordRequest } from '../../shared/types.js';
import { VerificationService } from '../services/verification.service.js';

// --- Zod Schemas ---

const sendVerificationCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  usage: z.enum(['login', 'reset_password'], { errorMap: () => ({ message: '无效的用途' }) }),
});

const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, '密码必须为8-20位，包含字母和数字'),
  nickname: z.string().optional(),
});

const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().optional(),
  code: z.string().optional(),
}).refine(data => data.password || data.code, {
  message: "请输入密码或验证码",
  path: ["password"], // Associate error with password field
});

const resetPasswordSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  code: z.string().min(1, '验证码不能为空'),
  newPassword: z.string().regex(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, '密码格式不正确'),
});

// --- Controllers ---

/**
 * 发送验证码
 * POST /api/v1/auth/verification-code
 */
export async function sendVerificationCode(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = sendVerificationCodeSchema.safeParse(req.body);
    if (!parseResult.success) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, parseResult.error.issues[0].message);
      return;
    }
    const { phone, usage } = parseResult.data;

    await VerificationService.sendCode(phone, usage);
    successResponse(res, { message: '验证码已发送' });
  } catch (error: any) {
    console.error('发送验证码失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR, error.message || '发送失败');
  }
}

/**
 * 用户注册
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, parseResult.error.issues[0].message);
      return;
    }
    const { phone, password, nickname } = parseResult.data;

    // 检查手机号是否已注册
    const existingUser = await findUserByPhone(phone);
    if (existingUser) {
      errorResponse(res, ErrorCodes.PHONE_EXISTS);
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 生成默认昵称（如果未提供）
    // 格式: 用户 + 手机尾号(4位) + _ + 随机字符(4位)
    // 示例: 用户8000_a1b2
    let finalNickname = nickname;
    if (!finalNickname) {
      const suffix = Math.random().toString(36).substring(2, 6);
      finalNickname = `用户${phone.slice(-4)}_${suffix}`;
    }

    // 创建用户
    const userId = await createUser(phone, hashedPassword, finalNickname);

    // 查询新创建的用户
    const newUser = await findUserByPhone(phone);
    if (!newUser) {
      errorResponse(res, ErrorCodes.INTERNAL_ERROR, '用户创建失败');
      return;
    }

    // 生成 Token
    const token = generateToken({
      id: newUser.id, // V2: userId -> id
      phone: newUser.phone,
      role: newUser.role,
    });

    // 返回响应（符合API设计文档）
    // Camel Case
    const authResponse: any = {
      userId: newUser.id,
      phone: newUser.phone,
      nickName: newUser.nickname || '',
      token,
      isGuide: newUser.is_guide,
      role: newUser.role,
    };

    successResponse(res, authResponse);
  } catch (error) {
    console.error('注册失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * 用户登录 (支持 密码 或 验证码)
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, parseResult.error.issues[0].message);
      return;
    }
    const { phone, password, code } = parseResult.data;

    // 模式1: 验证码登录
    if (code) {
      const isValid = await VerificationService.verifyCode(phone, code, 'login');
      if (!isValid) {
        errorResponse(res, ErrorCodes.INVALID_CREDENTIALS, '验证码无效或已过期');
        return;
      }
    } 
    // 模式2: 密码登录 (Already handled by schema refine, but double check for logic flow)
    else if (password) {
       // schema already validated format if present
    }

    // 查找用户
    let user = await findUserByPhone(phone);

    // [Auto Register] 如果是验证码登录且用户不存在 -> 自动注册
    if (!user && code) {
      // 生成随机强密码 (因为用户是用验证码登录的，不知道密码)
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
      
      // 生成默认昵称
      const suffix = Math.random().toString(36).substring(2, 6);
      const nickname = `用户${phone.slice(-4)}_${suffix}`;
      
      await createUser(phone, hashedPassword, nickname);
      user = await findUserByPhone(phone);
    }

    if (!user) {
      // 仅密码登录模式下，用户不存在报错
      errorResponse(res, ErrorCodes.INVALID_CREDENTIALS, '用户不存在');
      return;
    }

    // [New] Check Ban Status (Double Guard: Login Layer)
    if (user.status === 'banned') {
      errorResponse(res, ErrorCodes.USER_BANNED, '账号已被封禁: ' + (user.banReason || '无'));
      return;
    }

    // 如果是密码登录，校验密码
    if (!code && password) {
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        errorResponse(res, ErrorCodes.INVALID_CREDENTIALS, '密码错误');
        return;
      }
    }

    // 更新最后登录时间
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // 生成 Token
    const token = generateToken({
      id: user.id, // V2: userId -> id
      phone: user.phone,
      role: user.role,
    });

    // 返回响应（符合API设计文档）
    // Camel Case
    const authResponse: any = {
      userId: user.id,
      phone: user.phone,
      nickName: user.nickname || '',
      token,
      isGuide: user.is_guide,
      role: user.role,
    };

    successResponse(res, authResponse);
  } catch (error) {
    console.error('登录失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}

/**
 * 重置密码
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      errorResponse(res, ErrorCodes.INVALID_PARAMS, parseResult.error.issues[0].message);
      return;
    }
    const { phone, code, newPassword } = parseResult.data;

    const isValid = await VerificationService.verifyCode(phone, code, 'reset_password');
    if (!isValid) {
      errorResponse(res, ErrorCodes.INVALID_CREDENTIALS, '验证码无效或已过期');
      return;
    }

    const user = await findUserByPhone(phone);
    if (!user) {
      errorResponse(res, ErrorCodes.INVALID_CREDENTIALS, '用户不存在');
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));

    successResponse(res, { message: '密码重置成功' });
  } catch (error) {
    console.error('重置密码失败:', error);
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
      userId: user.id,
      phone: user.phone,
      nickName: user.nickname || '',
      // Removed avatarUrl
      role: user.role,
      isGuide: user.is_guide,
      balance: user.balance,
      createdAt: user.created_at, // assuming user object has created_at mapped
    };

    successResponse(res, userInfo);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    errorResponse(res, ErrorCodes.INTERNAL_ERROR);
  }
}
