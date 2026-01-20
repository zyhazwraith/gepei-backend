import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// 所有路由都需要管理员权限
router.use(authenticate, authorize(['admin']));

// GET /api/v1/admin/orders - 获取所有订单
router.get('/orders', asyncHandler(adminController.getOrders));

// PUT /api/v1/admin/orders/:id/status - 更新订单状态
router.put('/orders/:id/status', asyncHandler(adminController.updateOrderStatus));

// GET /api/v1/admin/users - 获取所有用户
router.get('/users', asyncHandler(adminController.getUsers));

export default router;
