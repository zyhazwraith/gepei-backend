import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { updateUserProfile } from '../controllers/user.controller';

const router = Router();

// POST /api/v1/users/profile
router.post('/profile', authenticate, updateUserProfile);

export default router;
