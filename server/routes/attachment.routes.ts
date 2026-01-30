import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadAttachment } from '../controllers/attachment.controller.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Ensure temp upload dir exists
const tempUploadDir = path.join(process.cwd(), 'uploads/temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Configure Multer for temp storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// POST /api/v1/attachments/:usage
// usage is part of URL for RBAC and semantic clarity
router.post('/:usage', 
  authenticate, 
  upload.single('file'), 
  asyncHandler(uploadAttachment)
);

export default router;
