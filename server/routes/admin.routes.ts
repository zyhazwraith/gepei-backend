import { Router } from 'express';
import { requireAdmin, authenticate, authorize } from '../middleware/auth.middleware';
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

// Apply authentication to all routes
router.use(authenticate);

// 1. Shared Admin/CS Routes
// ----------------------------------------------------------------

// GET /api/v1/admin/users
router.get('/users', authorize(['admin', 'cs']), asyncHandler(listUsers));

// GET /api/v1/admin/orders
router.get('/orders', authorize(['admin', 'cs']), asyncHandler(getOrders));

// PUT /api/v1/admin/orders/:id/status
router.put('/orders/:id/status', authorize(['admin', 'cs']), asyncHandler(updateOrderStatus));

// POST /api/v1/admin/orders/:id/assign
router.post('/orders/:id/assign', authorize(['admin', 'cs']), asyncHandler(assignGuide));

// Guide Management (Admin & CS can view/audit)
// GET /api/v1/admin/guides - 获取地陪列表
router.get('/guides', authorize(['admin', 'cs']), asyncHandler(listGuides));

// GET /api/v1/admin/guides/:userId - 获取地陪详情
router.get('/guides/:userId', authorize(['admin', 'cs']), asyncHandler(getGuideDetail));

// PUT /api/v1/admin/guides/:userId - 更新地陪状态与定价 (Audit)
router.put('/guides/:userId', authorize(['admin', 'cs']), asyncHandler(updateGuideStatus));


// 2. Admin Only Routes
// ----------------------------------------------------------------

// PUT /api/v1/admin/system-configs - 更新系统配置
router.put('/system-configs', requireAdmin, asyncHandler(updateConfigs));

export default router;
