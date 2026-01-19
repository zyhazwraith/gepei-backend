import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as authController from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/register - 用户注册
router.post('/register', asyncHandler(authController.register));

// POST /api/auth/login - 用户登录
router.post('/login', asyncHandler(authController.login));

export default router;
