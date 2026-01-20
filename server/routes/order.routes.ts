import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

// POST /api/v1/orders - 创建订单
router.post('/', asyncHandler(authenticate), asyncHandler(orderController.createOrder));

// GET /api/v1/orders - 获取订单列表
router.get('/', asyncHandler(authenticate), asyncHandler(orderController.getOrders));

// POST /api/v1/orders/:id/payment - 支付订单
router.post('/:id/payment', asyncHandler(authenticate), asyncHandler(orderController.payOrder));

// GET /api/v1/orders/:id - 获取订单详情
router.get('/:id', asyncHandler(authenticate), asyncHandler(orderController.getOrderById));

export default router;
