import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, ForbiddenError, ERROR_CODES } from '../utils/errors.js';
import { verifyToken, extractTokenFromHeader, TokenPayload } from '../utils/jwt.js';
import { findUserById } from '../models/user.model.js';
import { User } from '../types/index.js';

// 扩展Express Request类型，添加user属性
declare global {
  namespace Express {
    interface Request {
      user?: User;
      tokenPayload?: TokenPayload;
    }
  }
}

// 认证中间件 - 验证JWT Token
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 从请求头中提取Token
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      throw new AuthenticationError('未提供认证Token', ERROR_CODES.UNAUTHORIZED);
    }

    // 验证Token
    const payload = verifyToken(token);

    // 查询用户信息
    const user = await findUserById(payload.userId);
    if (!user) {
      throw new AuthenticationError('用户不存在', ERROR_CODES.USER_NOT_FOUND);
    }

    // 将用户信息和Token payload附加到请求对象
    req.user = user;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    next(error);
  }
}

// 管理员权限中间件
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new AuthenticationError('未登录', ERROR_CODES.UNAUTHORIZED));
    return;
  }

  if (req.user.role !== 'admin') {
    next(new ForbiddenError('需要管理员权限'));
    return;
  }

  next();
}

// 角色授权中间件
export function authorize(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AuthenticationError('未登录', ERROR_CODES.UNAUTHORIZED));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('权限不足'));
      return;
    }

    next();
  };
}
