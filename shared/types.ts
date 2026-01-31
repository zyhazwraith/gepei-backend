/**
 * 共享类型定义
 * 前后端共用
 */

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

/**
 * 用户信息
 */
export interface User {
  id: number;
  phone: string;
  nickname: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  is_guide: boolean;
  balance: number;
  created_at: Date;
}

/**
 * 注册请求
 */
export interface RegisterRequest {
  phone: string;
  password: string;
  nickname: string;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  phone: string;
  password: string;
}

/**
 * 认证响应
 */
export interface AuthResponse {
  user_id: number;
  phone: string;
  nickname: string;
  token: string;
  is_guide: boolean;
  role: 'user' | 'admin';
}

/**
 * JWT Payload
 */
export interface JwtPayload {
  userId: number;
  phone: string;
  role: 'user' | 'admin' | 'cs';
}
