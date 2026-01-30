import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { db } from '../db/index.js';
import { attachments } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import { ValidationError } from '../utils/errors.js';

// Strategy Configuration
interface Strategy {
  slot: string; // Default slot
  path: (ctx: { contextId?: string; slot: string }) => string;
  format: 'webp' | 'jpeg' | 'png';
  resize?: { width?: number; height?: number; fit?: keyof sharp.FitEnum };
  quality: number;
  description: string;
}

const STRATEGIES: Record<string, Strategy> = {
  avatar: {
    slot: 'main',
    path: (ctx) => `avatars/u_${ctx.contextId}.webp`,
    format: 'webp',
    resize: { width: 200, height: 200, fit: 'cover' },
    quality: 80,
    description: "用户/地陪头像，单例覆盖"
  },
  guide_photo: {
    slot: '1',
    path: (ctx) => `guides/u_${ctx.contextId}_p_${ctx.slot}.webp`,
    format: 'webp',
    resize: { width: 1080, fit: 'inside' },
    quality: 80,
    description: "地陪相册 (slot: 1-5)"
  },
  check_in: {
    slot: 'start', // or 'end'
    path: (ctx) => `orders/o_${ctx.contextId}_${ctx.slot}.webp`,
    format: 'webp',
    resize: { width: 1080, fit: 'inside' },
    quality: 80,
    description: "订单打卡 (slot: start/end)"
  },
  system: {
    slot: 'qrcode',
    path: (ctx) => `system/${ctx.slot}.png`,
    format: 'png',
    // No resize for system images (keep original quality mostly, or just convert format)
    quality: 90,
    description: "系统配置"
  }
};

interface UploadContext {
  file: Express.Multer.File;
  usage: string;
  contextId?: string;
  slot?: string;
  uploaderId: number;
}

export class AttachmentService {
  private static UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

  /**
   * Process and save attachment
   */
  static async processAndSave(ctx: UploadContext) {
    const strategy = STRATEGIES[ctx.usage];
    if (!strategy) {
      throw new ValidationError(`Unsupported usage type: ${ctx.usage}`);
    }

    // 1. Determine Slot & Context
    const slot = ctx.slot || strategy.slot;
    // Validate contextId presence for non-system types
    if (ctx.usage !== 'system' && !ctx.contextId) {
        throw new ValidationError(`contextId is required for ${ctx.usage}`);
    }

    // 2. Generate Key (Relative Path)
    const key = strategy.path({ contextId: ctx.contextId, slot });
    const fullPath = path.join(this.UPLOAD_ROOT, key);

    // 3. Ensure Directory Exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // 4. Process Image with Sharp
    const pipeline = sharp(ctx.file.path);
    
    // Resize if configured
    if (strategy.resize) {
      pipeline.resize({
        width: strategy.resize.width,
        height: strategy.resize.height,
        fit: strategy.resize.fit || 'cover',
        withoutEnlargement: true
      });
    }

    // Format conversion
    if (strategy.format === 'webp') {
      pipeline.webp({ quality: strategy.quality });
    } else if (strategy.format === 'jpeg') {
      pipeline.jpeg({ quality: strategy.quality });
    } else if (strategy.format === 'png') {
      pipeline.png({ quality: strategy.quality });
    }

    // Save to disk (Overwrite)
    await pipeline.toFile(fullPath);

    // 5. Clean up temp file (Multer temp)
    // Note: Multer might not clean up automatically if we don't handle it
    try {
        await fs.unlink(ctx.file.path);
    } catch (e) {
        // Ignore if file doesn't exist
    }

    // 6. Upsert Database Record
    // URL with timestamp for cache busting
    const url = `/uploads/${key}?t=${Date.now()}`;
    
    await db.insert(attachments).values({
      uploaderId: ctx.uploaderId,
      key: key,
      url: url, // Note: URL in DB will update on each upload to have new timestamp
      storageType: 'local',
      fileType: `image/${strategy.format}`,
      usageType: ctx.usage,
      updatedAt: new Date()
    }).onDuplicateKeyUpdate({
      set: {
        uploaderId: ctx.uploaderId,
        url: url,
        updatedAt: new Date(),
        fileType: `image/${strategy.format}`
      }
    });

    // 7. Return Result
    return {
      key,
      url,
      usage: ctx.usage,
      slot
    };
  }
}
