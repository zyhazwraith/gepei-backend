import { Router } from 'express';
import { getPublicConfigs } from '../controllers/system-config.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/system-configs?keys=...
// Public access, whitelist filtered by service
router.get('/', asyncHandler(getPublicConfigs));

export default router;
