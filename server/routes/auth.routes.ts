import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authThrottle, verificationCodeThrottle } from '../middleware/throttle.middleware.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// POST /api/v1/auth/register - 用户注册
router.post('/register', authThrottle, asyncHandler(authController.register));

// POST /api/v1/auth/login - 用户登录
router.post('/login', authThrottle, asyncHandler(authController.login));

// POST /api/v1/auth/verification-code - 发送验证码
router.post('/verification-code', verificationCodeThrottle, asyncHandler(authController.sendVerificationCode));

// POST /api/v1/auth/reset-password - 重置密码
router.post('/reset-password', authThrottle, asyncHandler(authController.resetPassword));

// GET /api/v1/auth/me - 获取当前用户信息（需要认证）
router.get('/me', asyncHandler(authenticate), asyncHandler(authController.getCurrentUser));

export default router;
