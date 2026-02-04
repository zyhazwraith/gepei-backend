import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { WalletController } from '../controllers/wallet.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/wallet/summary - 钱包概览
router.get('/summary', asyncHandler(WalletController.getSummary));

// GET /api/v1/wallet/logs - 钱包流水列表
router.get('/logs', asyncHandler(WalletController.getLogs));

// POST /api/v1/wallet/withdraw - 发起提现
router.post('/withdraw', asyncHandler(WalletController.applyWithdraw));

export default router;
