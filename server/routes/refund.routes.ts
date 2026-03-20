import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import * as refundController from '../controllers/refund.controller.js';

const router = Router();

router.get('/:outRefundNo/status', asyncHandler(authenticate), asyncHandler(refundController.getRefundStatus));

export default router;
