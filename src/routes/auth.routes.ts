import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as authController from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/register - 用户注册
router.post('/register', asyncHandler(authController.register));

export default router;
