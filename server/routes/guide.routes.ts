import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import * as guideController from '../controllers/guide.controller.js';

const router = Router();

// GET /api/v1/guides - 获取地陪列表（公开）
router.get('/', asyncHandler(guideController.getGuides));

// POST /api/v1/guides/profile - 更新地陪资料（包含认证）
router.post('/profile', asyncHandler(authenticate), asyncHandler(guideController.updateGuideProfile));

// GET /api/v1/guides/profile - 获取当前用户的地陪资料
router.get('/profile', asyncHandler(authenticate), asyncHandler(guideController.getGuideProfile));

// PUT /api/v1/guides/profile - 更新地陪资料
router.put('/profile', asyncHandler(authenticate), asyncHandler(guideController.updateGuideProfile));

// GET /api/v1/guides/:id - 获取地陪详情（公开）
router.get('/:id', asyncHandler(guideController.getGuideDetail));

export default router;
