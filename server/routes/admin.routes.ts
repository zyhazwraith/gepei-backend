import { Router } from 'express';
import { requireAdmin, authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  listUsers, 
  getOrders, 
  updateOrderStatus, 
  assignGuide 
} from '../controllers/admin.controller.js';
import { updateConfigs } from '../controllers/system-config.controller.js';
import { updateGuideStatus, listGuides, getGuideDetail } from '../controllers/admin.guide.controller.js';

const router = Router();

// Apply authentication and admin check to all routes
router.use(authenticate);
router.use(requireAdmin);

// GET /api/v1/admin/users
router.get('/users', asyncHandler(listUsers));

// GET /api/v1/admin/orders
router.get('/orders', asyncHandler(getOrders));

// PUT /api/v1/admin/orders/:id/status
router.put('/orders/:id/status', asyncHandler(updateOrderStatus));

// POST /api/v1/admin/orders/:id/assign
router.post('/orders/:id/assign', asyncHandler(assignGuide));

// PUT /api/v1/admin/system-configs - 更新系统配置 (Admin Only)
router.put('/system-configs', asyncHandler(updateConfigs));

// Guide Management
// GET /api/v1/admin/guides - 获取地陪列表
router.get('/guides', asyncHandler(listGuides));

// GET /api/v1/admin/guides/:userId - 获取地陪详情
router.get('/guides/:userId', asyncHandler(getGuideDetail));

// PUT /api/v1/admin/guides/:userId - 更新地陪状态与定价 (Admin Only)
router.put('/guides/:userId', asyncHandler(updateGuideStatus));

export default router;
