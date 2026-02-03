import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import * as orderController from '../controllers/order.controller.js';

const router = Router();

// POST /api/v1/overtime/:id/pay - 支付加时单
router.post('/:id/pay', asyncHandler(authenticate), asyncHandler(orderController.payOvertime));

export default router;