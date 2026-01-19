import jwt from 'jsonwebtoken';
import { AuthenticationError, ERROR_CODES } from './errors';

// 测试环境JWT配置（硬编码）
const JWT_SECRET = process.env.JWT_SECRET || 'gepei_test_jwt_secret_2026_UNcwX9XFV65zjBuc30LxJ';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Token payload 接口
export interface TokenPayload {
  userId: number;
  phone: string;
  role: 'user' | 'admin';
}

// 生成 JWT Token
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// 验证 JWT Token
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token已过期', ERROR_CODES.TOKEN_EXPIRED);
    }
    throw new AuthenticationError('Token无效', ERROR_CODES.INVALID_TOKEN);
  }
}

// 从请求头中提取 Token
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
