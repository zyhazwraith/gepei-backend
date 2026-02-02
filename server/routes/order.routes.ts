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

// GET /api/v1/orders/:id/candidates - 获取候选地陪
router.get('/:id/candidates', asyncHandler(authenticate), asyncHandler(orderController.getCandidates));

// POST /api/v1/orders/:id/select-guide - 用户选择地陪
router.post('/:id/select-guide', asyncHandler(authenticate), asyncHandler(orderController.selectGuide));

// POST /api/v1/orders/:id/check-in - 地陪打卡 (开始/结束服务)
router.post('/:id/check-in', asyncHandler(authenticate), asyncHandler(orderController.checkIn));

export default router;
