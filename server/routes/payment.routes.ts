import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

// GET /api/v1/payments/:transactionId/status - 查询支付状态（pending 时触发一次主动查询）
router.get('/:transactionId/status', asyncHandler(authenticate), asyncHandler(paymentController.getPaymentStatus));

export default router;
