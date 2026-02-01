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
    // 防御性检查：确保返回的是JSON对象
    if (response.data && typeof response.data !== 'object') {
      return Promise.reject({ code: 500, message: '服务器响应格式错误' });
    }
    // 这里已经直接返回了 response.data
    // 所以业务层拿到的是 { code: 0, data: {...}, message: "..." }
    // 而不是 axios 的 response 对象
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

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  code: number;
  message: string;
}

export interface User {
  userId: number;
  phone: string;
  nickName: string;
  avatarUrl: string;
  role: 'user' | 'admin';
  isGuide: number;
  balance: string;
}

export interface RegisterRequest {
  phone: string;
  password: string;
  nickName: string;
}

export interface RegisterResponse {
  userId: number;
  phone: string;
  nickName: string;
  token: string;
  isGuide: number;
  role: 'user' | 'admin';
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  phone: string;
  nickName: string;
  token: string;
  isGuide: number;
  role: 'user' | 'admin';
}

export interface Guide {
  userId: number; // Primary ID (same as User ID)
  // guideId: number; // Deprecated. Use userId.
  nickName?: string; // Fallback
  stageName: string; // V2: Main Display Name (花名)
  avatarUrl: string;
  avatarId?: number; // Attachment ID
  city: string;
  intro?: string;
  expectedPrice?: number; // Guide's input
  realPrice?: number; // Verified price
  price?: number; // Display price (usually same as realPrice)
  hourlyPrice?: number; // Legacy alias for price
  tags?: string[];
  photos: { id: number; url: string }[]; // V2: Object array
  distance?: number;
  idNumber?: string; // Sensitive
  idVerifiedAt?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export const uploadAttachment = async (file: File, usage: 'avatar' | 'guide_photo' | 'id_card_front' | 'id_card_back') => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post(`/attachments/${usage}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
// Removed deprecated uploadFile
// export const uploadFile = async (file: File) => { ... }

export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GetGuidesResponse {
  list: Guide[];
  pagination: Pagination;
}

export interface CreateOrderRequest {
  type: 'normal' | 'custom';
  serviceDate: string;
  serviceStartTime?: string;
  // Custom Order Fields
  city?: string;
  content?: string;
  budget?: number;
  requirements?: string;
  // Normal Order Fields
  guideId?: number;
  serviceHours?: number;
  duration?: number;
  serviceAddress?: string;
  serviceLat?: number;
  serviceLng?: number;
  remark?: string;
}

export interface CreateOrderResponse {
  orderId: number;
  amount: number;
}

export interface PayOrderResponse {
  orderId: number;
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
  status: 'pending' | 'paid' | 'waiting_for_user' | 'in_progress' | 'completed' | 'cancelled';
  serviceDate: string;
  serviceHours: number;
  serviceStartTime?: string;
  duration?: number;
  serviceAddress?: string;
  serviceLat?: number;
  serviceLng?: number;
  amount: string;
  deposit: string;
  requirements: string | null;
  createdAt: string;
  customRequirements?: CustomRequirements | null;
}

// ==================== API方法 ====================

/**
 * 获取订单列表
 */
export async function getOrders(status?: string): Promise<ApiResponse<OrderDetailResponse[]>> {
  const params: { status?: string } = {};
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
  return apiClient.post(`/orders/${orderId}/payment`, { paymentMethod });
}

/**
 * 获取地陪列表
 */
export async function getGuides(page: number = 1, pageSize: number = 20, city?: string, keyword?: string, lat?: number, lng?: number): Promise<ApiResponse<GetGuidesResponse>> {
  const params: any = { page, page_size: pageSize };
  if (city) params.city = city;
  if (keyword) params.keyword = keyword;
  if (lat) params.lat = lat;
  if (lng) params.lng = lng;
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
  nickName: string;
  role: 'user' | 'admin';
  isGuide: number;
  balance: string;
  createdAt: string;
}

export interface GetAdminUsersResponse {
  list: AdminUser[];
  pagination: Pagination;
}

export interface CreateCustomOrderRequest {
  userPhone: string;
  guidePhone: string;
  pricePerHour: number; // Cents
  duration: number; // Hours
  serviceStartTime: string; // ISO 8601
  serviceAddress: string;
  content: string;
  requirements?: string;
}

export interface CreateCustomOrderResponse {
  orderId: number;
  orderNumber: string;
  status: string;
  amount: number; // Cents
  pricePerHour: number; // Cents
  duration: number;
}

/**
 * 后台创建定制订单
 */
export async function createCustomOrder(data: CreateCustomOrderRequest): Promise<ApiResponse<CreateCustomOrderResponse>> {
  return apiClient.post('/admin/custom-orders', data);
}

/**
 * 获取订单详情 (管理员)
 */
export async function getOrderDetails(id: number): Promise<ApiResponse<AdminOrder>> {
  return apiClient.get(`/admin/orders/${id}`);
}

/**
 * 获取所有订单 (管理员)
 */
export async function getAdminOrders(page: number = 1, pageSize: number = 20, keyword?: string): Promise<ApiResponse<GetAdminOrdersResponse>> {
  const params: any = { page, limit: pageSize };
  if (keyword) params.keyword = keyword;
  return apiClient.get('/admin/orders', { params });
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

/**
 * 指派地陪 (管理员)
 */
export async function assignGuide(orderId: number, guideIds: number[]): Promise<ApiResponse<any>> {
  return apiClient.post(`/admin/orders/${orderId}/assign`, { guideIds });
}

export interface Candidate {
  guideId: number;
  nickName: string;
  avatarUrl: string;
  hourlyPrice: number | null;
  city: string;
  isSelected: boolean;
}

export interface GetCandidatesResponse {
  list: Candidate[];
}

/**
 * 获取候选地陪列表
 */
export async function getCandidates(orderId: number): Promise<ApiResponse<GetCandidatesResponse>> {
  return apiClient.get(`/orders/${orderId}/candidates`);
}

/**
 * 用户选择地陪
 */
export async function selectGuide(orderId: number, guideId: number): Promise<ApiResponse<any>> {
  return apiClient.post(`/orders/${orderId}/select-guide`, { guideId });
}

// ==================== F-3: System Config API ====================

export interface SystemConfigs {
  [key: string]: string | null;
}

export interface UpdateSystemConfigRequest {
  configs: {
    key: string;
    value: string;
    description?: string;
  }[];
}

/**
 * 获取系统配置 (Public)
 */
export async function getPublicConfigs(): Promise<ApiResponse<SystemConfigs>> {
  return apiClient.get('/system-configs');
}

/**
 * 更新系统配置 (Admin)
 */
export async function updateSystemConfigs(data: UpdateSystemConfigRequest): Promise<ApiResponse<any>> {
  return apiClient.put('/admin/system-configs', data);
}

export default apiClient;
