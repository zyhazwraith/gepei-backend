// 用户相关类型
export interface User {
  id: number;
  phone: string;
  password: string;
  nickname: string | null;
  is_guide: boolean;
  role: 'user' | 'admin' | 'cs';
  status?: 'active' | 'banned';
  banReason?: string | null;
  balance: number;
  created_at: Date;
  last_login_at?: Date | null;
  updated_at: Date;
  deleted_at: Date | null;
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

// 地陪信息接口 (V2) - CamelCase
export interface Guide {
  userId: number;
  stageName: string; // V2: Renamed from name
  avatarId: number | null; // V2: Added
  idNumber: string;
  city: string;
  address: string | null;
  intro: string | null;
  expectedPrice: number | null; // 期望价格
  realPrice: number | null;     // 真实/展示价格
  tags: string[] | null;
  photoIds: number[] | null;    // 附件ID列表
  latitude: number | null;
  longitude: number | null;
  idVerifiedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  userNickName?: string | null;
}
