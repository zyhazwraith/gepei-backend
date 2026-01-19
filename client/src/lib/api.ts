/**
 * API客户端配置
 * 基于axios封装，调用后端RESTful API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getToken, removeToken } from '../utils/token';

// API基础URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加Token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一处理响应和错误
apiClient.interceptors.response.use(
  (response) => {
    // 返回data字段
    return response.data;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    // Token过期或无效，清除本地Token并跳转登录
    if (error.response?.data?.code === 1004) {
      removeToken();
      window.location.href = '/login';
    }
    
    // 返回错误信息
    return Promise.reject(error.response?.data || { code: 2001, message: '网络错误' });
  }
);

// ==================== 类型定义 ====================

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  code: number;
  message: string;
}

export interface User {
  user_id: number;
  phone: string;
  nickname: string;
  avatar_url: string;
  role: 'user' | 'admin';
  is_guide: number;
  balance: string;
}

export interface RegisterRequest {
  phone: string;
  password: string;
  nickname: string;
}

export interface RegisterResponse {
  user_id: number;
  phone: string;
  nickname: string;
  token: string;
  is_guide: number;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  user_id: number;
  phone: string;
  nickname: string;
  token: string;
  is_guide: number;
}

// ==================== API方法 ====================

/**
 * 用户注册
 */
export async function register(data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> {
  return apiClient.post('/auth/register', data);
}

/**
 * 用户登录
 */
export async function login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  return apiClient.post('/auth/login', data);
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return apiClient.get('/auth/me');
}

export default apiClient;
