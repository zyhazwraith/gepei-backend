import { Request, Response } from 'express';
import { AttachmentService } from '../services/attachment.service.js';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { z } from 'zod';
import { db } from '../db/index.js';
import { orders } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { resolveGuidePhotoStorageSlot } from '../utils/guide-photo-slot.js';

const usageSchema = z.enum(['avatar', 'guide_photo', 'check_in', 'system']);
const positiveIntStringSchema = z.string().regex(/^[1-9]\d*$/, 'contextId 必须为正整数');
const checkInSlotSchema = z.enum(['start', 'end']);
const systemSlotSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,50}$/, 'slot 格式无效');

export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const usage = usageSchema.parse(req.params.usage);
    const { contextId, slot } = req.body;
    const file = req.file;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isGuide = !!req.user?.is_guide;

    if (!file) {
      throw new ValidationError('未上传文件');
    }
    if (!userId || !userRole) {
      throw new ForbiddenError('未登录');
    }

    let finalContextId: string | undefined;
    let finalSlot: string | undefined;

    if (usage === 'system') {
      if (userRole !== 'admin') {
        throw new ForbiddenError('只有管理员可以上传系统文件');
      }
      finalSlot = slot ? systemSlotSchema.parse(String(slot)) : 'qrcode';
    } else if (usage === 'avatar' || usage === 'guide_photo') {
      if (userRole === 'admin') {
        if (!contextId) {
          throw new ValidationError('contextId 不能为空');
        }
        finalContextId = positiveIntStringSchema.parse(String(contextId));
      } else {
        if (contextId && String(contextId) !== String(userId)) {
          throw new ForbiddenError('只能操作自己的文件');
        }
        finalContextId = String(userId);
      }

      if (usage === 'guide_photo') {
        const resolvedSlot = resolveGuidePhotoStorageSlot(slot);
        if (!resolvedSlot) {
          throw new ValidationError('guide_photo slot 仅支持 0-4');
        }
        finalSlot = resolvedSlot;
      }
    } else if (usage === 'check_in') {
      if (!contextId) {
        throw new ValidationError('contextId 不能为空');
      }

      const orderId = parseInt(positiveIntStringSchema.parse(String(contextId)), 10);
      const [order] = await db.select({ id: orders.id, guideId: orders.guideId })
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!order) {
        throw new NotFoundError('订单不存在');
      }

      if (userRole !== 'admin') {
        if (!isGuide) {
          throw new ForbiddenError('仅地陪可上传打卡凭证');
        }
        if (order.guideId !== userId) {
          throw new ForbiddenError('只能上传本人订单的打卡凭证');
        }
      }

      finalContextId = String(orderId);
      finalSlot = slot ? checkInSlotSchema.parse(String(slot)) : 'start';
    }

    const result = await AttachmentService.processAndSave({
      file,
      usage,
      contextId: finalContextId,
      slot: finalSlot,
      uploaderId: userId
    });

    res.json({
      code: 0,
      message: '上传成功',
      data: result
    });

  } catch (error: any) {
    console.error('Attachment upload error:', error);
    // If it's a known error, pass it through
    if (error instanceof ValidationError || error instanceof ForbiddenError) {
        throw error;
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.issues[0]?.message || '参数校验失败');
    }
    res.status(500).json({
      code: ErrorCodes.INTERNAL_ERROR,
      message: error.message || '文件上传失败',
      data: null
    });
  }
};
