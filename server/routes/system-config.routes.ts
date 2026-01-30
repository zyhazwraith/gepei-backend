import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { getPublicConfigs, updateConfigs } from '../controllers/system-config.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// 1. Get Public Configs
// GET /api/v1/system-configs?keys=...
// Public access, whitelist filtered by service
router.get('/', asyncHandler(getPublicConfigs));

// 2. Update Configs (Admin)
// PUT /api/v1/admin/system-configs
// Admin only
router.put('/', authenticate, requireAdmin, asyncHandler(updateConfigs));

export default router;
