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
  role: 'user' | 'admin';
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
  role: 'user' | 'admin';
}

export interface Guide {
  id: number;
  user_id: number;
  name: string;
  city: string;
  intro: string | null;
  hourly_price: number | null;
  tags: string[] | null;
  photos: string[] | null;
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GetGuidesResponse {
  list: Guide[];
  pagination: Pagination;
}

export interface CreateOrderRequest {
  service_date: string;
  city: string;
  content: string;
  budget: number;
  requirements?: string;
}

export interface CreateOrderResponse {
  order_id: number;
  amount: number;
}

export interface PayOrderResponse {
  order_id: number;
  status: string;
}

export interface CustomRequirements {
  destination: string;
  startDate: string;
  endDate: string;
  peopleCount: number;
  budget: string;
  specialRequirements: string;
}

export interface OrderDetailResponse {
  id: number;
  orderNumber: string;
  userId: number;
  guideId: number | null;
  orderType: 'normal' | 'custom';
  status: 'pending' | 'paid' | 'in_progress' | 'completed' | 'cancelled';
  serviceDate: string;
  serviceHours: number;
  amount: string;
  deposit: string;
  requirements: string | null;
  createdAt: string;
  custom_requirements?: CustomRequirements | null;
}

// ==================== API方法 ====================

/**
 * 获取订单列表
 */
export async function getOrders(status?: string): Promise<ApiResponse<OrderDetailResponse[]>> {
  const params: any = {};
  if (status && status !== 'all') {
    params.status = status;
  }
  return apiClient.get('/orders', { params });
}

/**
 * 创建定制订单
 */
export async function createOrder(data: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> {
  return apiClient.post('/orders', data);
}

/**
 * 获取订单详情
 */
export async function getOrderById(id: number): Promise<ApiResponse<OrderDetailResponse>> {
  return apiClient.get(`/orders/${id}`);
}

/**
 * 支付订单
 */
export async function payOrder(orderId: number, paymentMethod: 'wechat' | 'alipay'): Promise<ApiResponse<PayOrderResponse>> {
  return apiClient.post(`/orders/${orderId}/payment`, { payment_method: paymentMethod });
}

/**
 * 获取地陪列表
 */
export async function getGuides(page: number = 1, pageSize: number = 20, city?: string, keyword?: string): Promise<ApiResponse<GetGuidesResponse>> {
  const params: any = { page, page_size: pageSize };
  if (city) params.city = city;
  if (keyword) params.keyword = keyword;
  return apiClient.get('/guides', { params });
}

/**
 * 获取地陪详情
 */
export async function getGuideDetail(id: number): Promise<ApiResponse<Guide>> {
  return apiClient.get(`/guides/${id}`);
}

/**
 * 更新地陪资料
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

export interface AdminOrder extends OrderDetailResponse {
  userPhone?: string;
  userNickname?: string;
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return apiClient.get('/auth/me');
}

export interface GetAdminOrdersResponse {
  list: AdminOrder[];
  pagination: Pagination;
}

export interface AdminUser {
  id: number;
  phone: string;
  nickname: string;
  role: 'user' | 'admin';
  isGuide: number;
  balance: string;
  createdAt: string;
}

export interface GetAdminUsersResponse {
  list: AdminUser[];
  pagination: Pagination;
}

/**
 * 获取所有订单 (管理员)
 */
export async function getAdminOrders(page: number = 1, pageSize: number = 20): Promise<ApiResponse<GetAdminOrdersResponse>> {
  return apiClient.get('/admin/orders', { params: { page, limit: pageSize } });
}

/**
 * 获取所有用户 (管理员)
 */
export async function getAdminUsers(page: number = 1, pageSize: number = 20, keyword?: string): Promise<ApiResponse<GetAdminUsersResponse>> {
  const params: any = { page, limit: pageSize };
  if (keyword) params.keyword = keyword;
  return apiClient.get('/admin/users', { params });
}

/**
 * 更新订单状态 (管理员)
 */
export async function updateOrderStatus(id: number, status: string): Promise<ApiResponse<any>> {
  return apiClient.put(`/admin/orders/${id}/status`, { status });
}

export default apiClient;
