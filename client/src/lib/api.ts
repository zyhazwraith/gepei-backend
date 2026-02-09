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

export const OrderStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  WAITING_SERVICE: 'waiting_service',
  IN_SERVICE: 'in_service',
  SERVICE_ENDED: 'service_ended',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

export interface User {
  userId: number;
  phone: string;
  nickName: string;
  avatarUrl: string;
  role: 'user' | 'admin';
  isGuide: boolean;
  balance?: string;
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
  isGuide: boolean;
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
  isGuide: boolean;
  role: 'user' | 'admin';
}

export interface Guide {
  userId: number; // Primary ID (same as User ID)
  nickName?: string; // Fallback
  stageName: string; // V2: Main Display Name (花名)
  realName?: string; // V2.1: Real Name (Private)
  avatarUrl: string;
  avatarId?: number; // Attachment ID
  city: string;
  intro?: string;
  expectedPrice?: number; // Guide's input
  realPrice?: number; // Verified price
  price?: number; // Display price (usually same as realPrice)
  tags?: string[];
  photos: { id: number; url: string }[]; // V2: Object array
  distance?: number;
  idNumber?: string; // Sensitive
  idVerifiedAt?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export const uploadAttachment = async (file: File, usage: 'avatar' | 'guide_photo' | 'id_card_front' | 'id_card_back' | 'check_in', contextId?: string, slot?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (contextId) {
    formData.append('contextId', contextId);
  }
  if (slot) {
    formData.append('slot', slot);
  }
  // Add usage to form data as well if backend needs it, or just path param
  // Backend route is /attachments/:usage, so path param handles it.
  const response = await apiClient.post(`/attachments/${usage}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response;
};

// ... existing code ...

/**
 * 订单打卡 (S-1)
 */
export async function checkInOrder(orderId: number, data: {
  type: 'start' | 'end';
  attachmentId: number;
  lat: number;
  lng: number;
}): Promise<ApiResponse<any>> {
  return apiClient.post(`/orders/${orderId}/check-in`, data);
}

// ==================== F-3: System Config API ====================

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

export interface OvertimeRecord {
  id: number;
  duration: number;
  fee: number;
  status: 'pending' | 'paid';
  createdAt: string;
}

export interface OrderDetailResponse {
  id: number;
  orderNumber: string;
  userId: number;
  guideId: number | null;
  orderType: 'normal' | 'custom';
  status: 'pending' | 'paid' | 'waiting_service' | 'in_service' | 'service_ended' | 'completed' | 'cancelled' | 'refunded';
  serviceDate: string;
  serviceHours: number;
  serviceStartTime?: string;
  serviceEndTime?: string; // S-3
  pricePerHour?: number; // S-3
  totalDuration?: number; // S-3
  serviceAddress?: string;
  serviceLat?: number;
  serviceLng?: number;
  totalAmout: string;
  deposit: string;
  requirements: string | null;
  createdAt: string;
  paidAt?: string; // Added for refund logic
  customRequirements?: CustomRequirements | null;
  overtimeRecords?: OvertimeRecord[]; // S-3
  amount: number; // 订单原价
  totalAmount?: number; // 订单总流水
  guideIncome?: number; // 地陪收入
  refundAmount?: number; // 已退款金额
  refund_records?: Array<{ // 退款流水
    amount: number;
    reason: string;
    createdAt: string;
  }>;
}

export interface CreateOvertimeResponse {
  overtimeId: number;
  duration: number;
  fee: number;
  pricePerHour: number;
}

// ... existing code ...

/**
 * 创建加时申请 (S-3)
 */
export async function createOvertime(orderId: number, duration: number): Promise<ApiResponse<CreateOvertimeResponse>> {
  return apiClient.post(`/orders/${orderId}/overtime`, { duration });
}

/**
 * 支付加时单 (S-3)
 */
export async function payOvertime(overtimeId: number, paymentMethod: 'wechat' | 'alipay'): Promise<ApiResponse<any>> {
  return apiClient.post(`/overtime/${overtimeId}/pay`, { paymentMethod });
}

// ==================== API方法 ====================

export interface GetOrdersResponse {
  list: OrderDetailResponse[];
  pagination: Pagination;
}

/**
 * 获取订单列表
 * @param viewAs 'customer' | 'guide' (optional, default 'customer')
 */
export async function getOrders(status?: string, viewAs: 'customer' | 'guide' = 'customer', page: number = 1, limit: number = 10): Promise<ApiResponse<GetOrdersResponse>> {
  const params: { status?: string; viewAs?: string; page: number; limit: number } = { viewAs, page, limit };
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

export interface AdminGuide extends Guide {
  phone?: string;
  isGuide: boolean;
  status?: 'online' | 'offline'; // V2.2: Visibility Status
  updatedAt?: string;
}

export interface GetAdminGuidesResponse {
  list: AdminGuide[];
  pagination: Pagination;
}

/**
 * 获取地陪列表 (Admin)
 * @param isGuide undefined=All, true=Verified, false=Pending
 */
export async function getAdminGuides(
  page: number = 1, 
  pageSize: number = 20, 
  keyword?: string,
  city?: string,
  isGuide?: boolean
): Promise<ApiResponse<GetAdminGuidesResponse>> {
  const params: any = { page, page_size: pageSize };
  if (keyword) params.keyword = keyword;
  if (city) params.city = city;
  if (isGuide !== undefined) params.is_guide = isGuide;
  
  return apiClient.get('/admin/guides', { params });
}

/**
 * 获取地陪详情 (Admin)
 */
export async function getAdminGuideDetail(userId: number): Promise<ApiResponse<AdminGuide>> {
  return apiClient.get(`/admin/guides/${userId}`);
}

/**
 * 审核地陪 (Admin)
 */
export async function updateAdminGuideStatus(userId: number, data: { isGuide?: boolean; status?: 'online' | 'offline'; realPrice?: number }): Promise<ApiResponse<AdminGuide>> {
  // Map camelCase to snake_case for backend
  const payload: any = {};
  if (data.isGuide !== undefined) payload.is_guide = data.isGuide;
  if (data.status !== undefined) payload.status = data.status;
  if (data.realPrice !== undefined) payload.real_price = data.realPrice;
  
  return apiClient.put(`/admin/guides/${userId}`, payload);
}

export interface AdminOrder extends OrderDetailResponse {
  userPhone?: string;
  userName?: string;
  creatorId?: number;
  creatorPhone?: string;
  creatorName?: string;
  guideName?: string;
  guidePhone?: string;
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
  role: 'user' | 'admin' | 'cs';
  isGuide: boolean;
  balance: string;
  createdAt: string;
  lastLoginAt?: string | null;
  status: 'active' | 'banned';
  banReason?: string;
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
export async function getAdminOrders(page: number = 1, pageSize: number = 20, keyword?: string, status?: string): Promise<ApiResponse<GetAdminOrdersResponse>> {
  const params: any = { page, limit: pageSize };
  if (keyword) params.keyword = keyword;
  if (status && status !== 'all') params.status = status;
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
 * 更新用户角色 (管理员)
 * @param role 'user' | 'cs'
 */
export async function updateUserRole(userId: number, role: 'user' | 'cs'): Promise<ApiResponse<any>> {
  return apiClient.put(`/admin/users/${userId}/role`, { role });
}

/**
 * 封禁用户 (管理员)
 */
export async function banUser(userId: number, reason: string): Promise<ApiResponse<any>> {
  return apiClient.put(`/admin/users/${userId}/ban`, { reason });
}

/**
 * 解封用户 (管理员)
 */
export async function unbanUser(userId: number): Promise<ApiResponse<any>> {
  return apiClient.put(`/admin/users/${userId}/unban`, {});
}

/**
 * 更新订单状态 (管理员) - REMOVED
 */
// export async function updateOrderStatus(id: number, status: string): Promise<ApiResponse<any>> {
//   return apiClient.put(`/admin/orders/${id}/status`, { status });
// }

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

// ==================== F-4: Wallet API ====================

export interface WalletLog {
  id: number;
  type: 'income' | 'withdraw_freeze' | 'withdraw_unfreeze' | 'withdraw_success' | 'refund';
  amount: number;
  relatedType: string;
  relatedId: number;
  createdAt: string;
  title?: string; // Optional enriched title
  status?: 'pending' | 'completed' | 'rejected'; // For withdrawals
  
  // Extended fields
  orderNumber?: string;
  adminNote?: string;
}

export interface WalletSummary {
  balance: number;
  frozen_amount: number;
}

export interface GetWalletLogsResponse {
  list: WalletLog[];
  pagination: Pagination;
}

export interface WithdrawResponse {
  id: number;
  amount: number;
  status: string;
}

/**
 * 获取钱包概览
 */
export async function getWalletSummary(): Promise<ApiResponse<WalletSummary>> {
  return apiClient.get('/wallet/summary');
}

/**
 * 获取钱包流水
 */
export async function getWalletLogs(page: number = 1, limit: number = 20): Promise<ApiResponse<GetWalletLogsResponse>> {
  return apiClient.get('/wallet/logs', { params: { page, limit } });
}

/**
 * 发起提现
 */
export async function applyWithdraw(amount: number, userNote: string): Promise<ApiResponse<WithdrawResponse>> {
  return apiClient.post('/wallet/withdraw', { amount, userNote });
}

export interface AdminWithdrawal {
  id: number;
  userId: number;
  userPhone: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  userNote: string;
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
}

export interface GetAdminWithdrawalsResponse {
  list: AdminWithdrawal[];
  pagination: Pagination;
}

/**
 * 获取提现列表 (Admin)
 */
export async function getAdminWithdrawals(params: {
  page?: number;
  limit?: number;
  status?: string;
  userId?: number;
  keyword?: string;
}): Promise<ApiResponse<GetAdminWithdrawalsResponse>> {
  const query: any = { page: params.page || 1, limit: params.limit || 10 };
  if (params.status && params.status !== 'all') query.status = params.status;
  if (params.userId) query.userId = params.userId;
  if (params.keyword) query.keyword = params.keyword;
  
  return apiClient.get('/admin/withdrawals', { params: query });
}

/**
 * 审核提现 (Admin)
 */
export async function auditWithdrawal(id: number, status: 'completed' | 'rejected', adminNote?: string): Promise<ApiResponse<any>> {
  return apiClient.put(`/admin/withdrawals/${id}`, { status, adminNote });
}

// ==================== O-7: Audit Logs API ====================

export interface AuditLog {
  id: number;
  operatorId: number;
  operatorName?: string;
  action: string;
  targetType: string;
  targetId: number | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface GetAuditLogsResponse {
  list: AuditLog[];
  pagination: Pagination;
}

/**
 * 获取审计日志列表 (Admin)
 */
export async function getAuditLogs(params: { 
  page: number; 
  limit: number; 
  action?: string; 
  target_type?: string;
  operator_id?: string; // Input as string, parse to number if needed
}): Promise<ApiResponse<GetAuditLogsResponse>> {
  const queryParams: any = { 
    page: params.page, 
    limit: params.limit 
  };
  
  if (params.action && params.action !== 'all') queryParams.action = params.action;
  if (params.target_type && params.target_type !== 'all') queryParams.target_type = params.target_type;
  if (params.operator_id) queryParams.operator_id = params.operator_id;

  return apiClient.get('/admin/audit-logs', { params: queryParams });
}

export interface StatsChartItem {
  date: string;
  count?: number;
  amount?: number;
  income?: number;
  withdraw?: number;
}

export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

export interface CSPerformanceItem {
  csId: number;
  csName: string;
  orderCount: number;
  totalAmount: number;
}

export interface CSPerformanceData {
  list: CSPerformanceItem[];
}

export interface PlatformFinanceData {
  summary: {
    totalIncome: number;
    totalWithdraw: number;
  };
  chartData: StatsChartItem[];
}

/**
 * 获取客服业绩 (Admin)
 */
export async function getCSPerformance(params: { timeRange: TimeRange; startDate?: string; endDate?: string }): Promise<ApiResponse<CSPerformanceData>> {
  return apiClient.get('/admin/stats/cs-performance', { params });
}

/**
 * 获取平台收支 (Admin)
 */
export async function getPlatformFinance(params: { timeRange: TimeRange; startDate?: string; endDate?: string }): Promise<ApiResponse<PlatformFinanceData>> {
  return apiClient.get('/admin/stats/platform-finance', { params });
}

export interface RefundOrderRequest {
  amount: number; // 单位: 分
  reason: string;
}

/**
 * 订单退款 (管理员) - Deprecated/Removed
 */
// export async function refundOrderAdmin(orderId: number, data: RefundOrderRequest): Promise<ApiResponse<any>> {
//   return apiClient.post(`/admin/orders/${orderId}/refund`, data);
// }

/**
 * 订单退款 (用户自助)
 */
export async function refundOrder(orderId: number): Promise<ApiResponse<{
  success: boolean;
  refundedAmount: number;
  penaltyApplied: boolean;
  message: string;
}>> {
  return apiClient.post(`/orders/${orderId}/refund`);
}

export default apiClient;
