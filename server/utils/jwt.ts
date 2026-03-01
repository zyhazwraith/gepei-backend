import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthenticationError, ERROR_CODES } from './errors.js';

const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
}

// Token payload 接口
export interface TokenPayload {
  id: number;
  phone: string;
  role: 'user' | 'admin' | 'cs';
}

// 生成 JWT Token
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN as any,
  });
}

// 验证 JWT Token
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token已过期', ERROR_CODES.TOKEN_INVALID);
    }
    throw new AuthenticationError('Token无效', ERROR_CODES.TOKEN_INVALID);
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
