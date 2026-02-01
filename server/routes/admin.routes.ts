import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  getDashboardStats, 
  getUsers, 
  updateUserStatus, 
  getOrders, 
  updateOrderStatus, 
  assignGuide 
} from '../controllers/admin.controller.js';
import { updateConfigs } from '../controllers/system-config.controller.js';
import { updateGuideStatus, listGuides, getGuideDetail } from '../controllers/admin.guide.controller.js';

const router = Router();

// GET /api/v1/admin/dashboard
router.get('/dashboard', asyncHandler(getDashboardStats));

// GET /api/v1/admin/users
router.get('/users', asyncHandler(getUsers));

// PUT /api/v1/admin/users/:id/status
router.put('/users/:id/status', asyncHandler(updateUserStatus));

// GET /api/v1/admin/orders
router.get('/orders', asyncHandler(getOrders));

// PUT /api/v1/admin/orders/:id/status
router.put('/orders/:id/status', asyncHandler(updateOrderStatus));

// POST /api/v1/admin/orders/:id/assign
router.post('/orders/:id/assign', asyncHandler(assignGuide));

// PUT /api/v1/admin/system-configs - 更新系统配置 (Admin Only)
// 注意：authorize(['admin', 'cs']) 允许客服，但 System Config 应该只允许 Admin
// 所以我们额外叠加 requireAdmin 中间件
router.put('/system-configs', requireAdmin, asyncHandler(updateConfigs));

// Guide Management
// GET /api/v1/admin/guides - 获取地陪列表
router.get('/guides', requireAdmin, asyncHandler(listGuides));

// GET /api/v1/admin/guides/:userId - 获取地陪详情
router.get('/guides/:userId', requireAdmin, asyncHandler(getGuideDetail));

// PUT /api/v1/admin/guides/:userId - 更新地陪状态与定价 (Admin Only)
router.put('/guides/:userId', requireAdmin, asyncHandler(updateGuideStatus));

export default router;
