import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, authorize, requireAdmin } from '../middleware/auth.middleware.js';
import * as adminController from '../controllers/admin.controller.js';
import { updateConfigs } from '../controllers/system-config.controller.js';

const router = Router();

// 所有路由都需要管理员权限 (admin or cs)
// V2 Update: Role check should be handled per route or group if granularity is needed.
// For now, most admin routes are for both. createCustomOrder is for both.
router.use(authenticate, authorize(['admin', 'cs']));

// POST /api/v1/admin/custom-orders - 后台创建定制单
router.post('/custom-orders', asyncHandler(adminController.createCustomOrder));

// GET /api/v1/admin/orders - 获取所有订单
router.get('/orders', asyncHandler(adminController.getOrders));

// GET /api/v1/admin/orders/:id - 获取订单详情
router.get('/orders/:id', asyncHandler(adminController.getOrderDetails));

// PUT /api/v1/admin/orders/:id/status - 更新订单状态
router.put('/orders/:id/status', asyncHandler(adminController.updateOrderStatus));

// POST /api/v1/admin/orders/:id/assign - 指派地陪
router.post('/orders/:id/assign', asyncHandler(adminController.assignGuide));

// GET /api/v1/admin/users - 获取所有用户
router.get('/users', asyncHandler(adminController.getUsers));

// PUT /api/v1/admin/system-configs - 更新系统配置 (Admin Only)
// 注意：authorize(['admin', 'cs']) 允许客服，但 System Config 应该只允许 Admin
// 所以我们额外叠加 requireAdmin 中间件
router.put('/system-configs', requireAdmin, asyncHandler(updateConfigs));

export default router;
