import { Router } from 'express';
import { requireAdmin, authenticate, authorize } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { 
  listUsers, 
  getOrders, 
  assignGuide,
  getOrderDetails,
  banUser,
  unbanUser,
  updateUserRole,
  createCustomOrder
} from '../controllers/admin.controller.js';
import { updateConfigs } from '../controllers/system-config.controller.js';
import { updateGuide, listGuides, getGuideDetail, createGuide } from '../controllers/admin.guide.controller.js';
import { listAuditLogs } from '../controllers/admin/audit-logs.controller.js';
import { AdminWithdrawController } from '../controllers/admin-withdraw.controller.js';
import { AdminStatsController } from '../controllers/admin-stats.controller.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// 1. Shared Admin/CS Routes
// ----------------------------------------------------------------

// GET /api/v1/admin/users
router.get('/users', authorize(['admin', 'cs']), asyncHandler(listUsers));

// GET /api/v1/admin/orders
router.get('/orders', authorize(['admin', 'cs']), asyncHandler(getOrders));

// GET /api/v1/admin/orders/:id
router.get('/orders/:id', authorize(['admin', 'cs']), asyncHandler(getOrderDetails));

// POST /api/v1/admin/custom-orders (T-2)
router.post('/custom-orders', authorize(['admin', 'cs']), asyncHandler(createCustomOrder));

// POST /api/v1/admin/orders/:id/assign
router.post('/orders/:id/assign', authorize(['admin', 'cs']), asyncHandler(assignGuide));

// Guide Management (Admin & CS can view/audit)
// GET /api/v1/admin/guides - 获取地陪列表
router.get('/guides', authorize(['admin', 'cs']), asyncHandler(listGuides));

// POST /api/v1/admin/guides - 创建地陪档案 (Admin Create)
router.post('/guides', authorize(['admin', 'cs']), asyncHandler(createGuide));

// GET /api/v1/admin/guides/:userId - 获取地陪详情
router.get('/guides/:userId', authorize(['admin', 'cs']), asyncHandler(getGuideDetail));

// PUT /api/v1/admin/guides/:userId - 更新地陪状态与定价 (Audit)
router.put('/guides/:userId', authorize(['admin', 'cs']), asyncHandler(updateGuide));

// GET /api/v1/admin/audit-logs - 获取审计日志
router.get('/audit-logs', authorize(['admin', 'cs']), asyncHandler(listAuditLogs));

// GET /api/v1/admin/stats/cs-performance - 获取客服业绩
router.get('/stats/cs-performance', authorize(['admin', 'cs']), asyncHandler(AdminStatsController.getCSPerformance));


// 2. Admin Only Routes
// ----------------------------------------------------------------

// PUT /api/v1/admin/users/:id/ban
router.put('/users/:id/ban', requireAdmin, asyncHandler(banUser));

// PUT /api/v1/admin/users/:id/unban
router.put('/users/:id/unban', requireAdmin, asyncHandler(unbanUser));

// PUT /api/v1/admin/users/:id/role - 更新用户角色
router.put('/users/:id/role', authorize(['admin']), asyncHandler(updateUserRole));



// PUT /api/v1/admin/system-configs - 更新系统配置
router.put('/system-configs', requireAdmin, asyncHandler(updateConfigs));

// GET /api/v1/admin/withdrawals - 获取提现列表
router.get('/withdrawals', requireAdmin, asyncHandler(AdminWithdrawController.list));

// PUT /api/v1/admin/withdrawals/:id - 审核提现
router.put('/withdrawals/:id', requireAdmin, asyncHandler(AdminWithdrawController.audit));

// GET /api/v1/admin/stats/platform-finance - 获取平台收支
router.get('/stats/platform-finance', requireAdmin, asyncHandler(AdminStatsController.getPlatformFinance));

export default router;
