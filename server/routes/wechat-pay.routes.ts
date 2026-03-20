import { raw, Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

// POST /wechat/pay/notify - 微信支付回调（原始报文）
router.post('/notify', raw({ type: 'application/json' }), asyncHandler(paymentController.wechatNotify));
router.post('/refund-notify', raw({ type: 'application/json' }), asyncHandler(paymentController.wechatRefundNotify));

export default router;
