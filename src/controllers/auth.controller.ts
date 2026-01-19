import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ValidationError, ConflictError, AuthenticationError, ERROR_CODES } from '../utils/errors';
import { validatePhone, validatePassword } from '../utils/validation';
import { generateToken } from '../utils/jwt';
import { findUserByPhone, createUser, toPublicUser } from '../models/user.model';
import { ApiResponse, RegisterRequest, LoginRequest } from '../types';

// 用户注册
export async function register(req: Request, res: Response): Promise<void> {
  const { phone, password, nickname }: RegisterRequest = req.body;

  // 验证手机号格式
  if (!phone || !validatePhone(phone)) {
    throw new ValidationError('手机号格式不正确', ERROR_CODES.INVALID_PHONE);
  }

  // 验证密码格式
  if (!password || !validatePassword(password)) {
    throw new ValidationError('密码长度必须在6-20位之间', ERROR_CODES.INVALID_PASSWORD);
  }

  // 检查手机号是否已注册
  const existingUser = await findUserByPhone(phone);
  if (existingUser) {
    throw new ConflictError('该手机号已注册', ERROR_CODES.PHONE_EXISTS);
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(password, 12);

  // 创建用户
  const userId = await createUser(phone, hashedPassword, nickname);

  // 查询新创建的用户
  const newUser = await findUserByPhone(phone);
  if (!newUser) {
    throw new Error('用户创建失败');
  }

  // 生成 Token
  const token = generateToken({
    userId: newUser.id,
    phone: newUser.phone,
    role: newUser.role,
  });

  // 返回响应
  const response: ApiResponse = {
    success: true,
    data: {
      user: toPublicUser(newUser),
      token,
    },
  };

  res.status(201).json(response);
}

// 用户登录
export async function login(req: Request, res: Response): Promise<void> {
  const { phone, password }: LoginRequest = req.body;

  // 验证手机号格式
  if (!phone || !validatePhone(phone)) {
    throw new ValidationError('手机号格式不正确', ERROR_CODES.INVALID_PHONE);
  }

  // 验证密码格式
  if (!password || !validatePassword(password)) {
    throw new ValidationError('密码格式不正确', ERROR_CODES.INVALID_PASSWORD);
  }

  // 查找用户
  const user = await findUserByPhone(phone);
  if (!user) {
    throw new AuthenticationError('手机号或密码错误', ERROR_CODES.INVALID_PASSWORD);
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError('手机号或密码错误', ERROR_CODES.INVALID_PASSWORD);
  }

  // 生成 Token
  const token = generateToken({
    userId: user.id,
    phone: user.phone,
    role: user.role,
  });

  // 返回响应
  const response: ApiResponse = {
    success: true,
    data: {
      user: toPublicUser(user),
      token,
    },
  };

  res.json(response);
}
