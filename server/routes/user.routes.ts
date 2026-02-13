import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { updateUserProfile } from '../controllers/user.controller.js';

const router = Router();

// POST /api/v1/users/profile
router.post('/profile', authenticate, updateUserProfile);

export default router;
