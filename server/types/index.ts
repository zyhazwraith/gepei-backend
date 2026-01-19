// 用户相关类型
export interface User {
  id: number;
  phone: string;
  password: string;
  nickname: string | null;
  avatar_url: string | null;
  is_guide: boolean;
  role: 'user' | 'admin';
  balance: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface UserPublic {
  id: number;
  phone: string;
  nickname: string | null;
  avatar_url: string | null;
  is_guide: boolean;
  balance: number;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// 请求类型
export interface RegisterRequest {
  phone: string;
  password: string;
  nickname?: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}
