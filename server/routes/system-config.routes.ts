import { Router } from 'express';
import { getPublicConfigs } from '../controllers/system-config.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/system-configs
// Public access, always returns all whitelisted configs
router.get('/', asyncHandler(getPublicConfigs));

export default router;
