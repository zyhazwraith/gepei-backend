import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

// GET /api/v1/payments/:outTradeNo/status - 查询支付状态（pending 时触发一次主动查询）
router.get('/:outTradeNo/status', asyncHandler(authenticate), asyncHandler(paymentController.getPaymentStatus));

// POST /api/v1/payments/wechat/notify - 微信回调（Phase1 骨架）
router.post('/wechat/notify', asyncHandler(paymentController.wechatNotify));

// POST /api/v1/payments/mock/:outTradeNo/result - Mock设置查单结果
router.post('/mock/:outTradeNo/result', asyncHandler(authenticate), asyncHandler(paymentController.setMockPaymentResult));

export default router;
