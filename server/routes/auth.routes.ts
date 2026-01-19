import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/register - 用户注册
router.post('/register', asyncHandler(authController.register));

// POST /api/auth/login - 用户登录
router.post('/login', asyncHandler(authController.login));

// GET /api/auth/me - 获取当前用户信息（需要认证）
router.get('/me', asyncHandler(authenticate), asyncHandler(authController.getCurrentUser));

export default router;
