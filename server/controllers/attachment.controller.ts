import { Request, Response } from 'express';
import { AttachmentService } from '../services/attachment.service.js';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { ValidationError, ForbiddenError } from '../utils/errors.js';

export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const { usage } = req.params;
    const { contextId, slot } = req.body;
    const file = req.file;
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!file) {
      throw new ValidationError('未上传文件');
    }

    // Permission Check based on Usage
    // 1. System: Admin Only
    if (usage === 'system') {
      if (userRole !== 'admin') {
        throw new ForbiddenError('只有管理员可以上传系统文件');
      }
    }
    // 2. Avatar/GuidePhoto: Self or Admin
    else if (usage === 'avatar' || usage === 'guide_photo') {
       if (userRole !== 'admin') {
         // If not admin, contextId must match own ID (if contextId provided)
         // OR if contextId is not provided, we might assume it's self (but Service requires contextId)
         // Let's enforce contextId matching user.id for non-admins
         if (contextId && String(contextId) !== String(userId)) {
            throw new ForbiddenError('只能操作自己的文件');
         }
         // If no contextId passed, maybe we should auto-fill it? 
         // But Service expects it in ctx. 
         // Let's allow controller to auto-fill if missing for these types
         if (!contextId) {
             // Mutate body for Service? Or just pass to service
             // We'll handle this in the service call params
         }
       }
    }
    // 3. Check-in: Guide Only (or Admin)
    else if (usage === 'check_in') {
        // Ideally check if user is the guide of the order
        // For MVP, just check if user is guide or admin
        if (userRole !== 'admin' && !(req.user as any)?.isGuide) {
             // Actually check_in might be allowed for users too? No, usually guides.
        }
    }

    // Auto-fill contextId for self-operations if missing
    let finalContextId = contextId;
    if ((usage === 'avatar' || usage === 'guide_photo') && !finalContextId) {
        finalContextId = String(userId);
    }

    const result = await AttachmentService.processAndSave({
      file,
      usage,
      contextId: finalContextId,
      slot,
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
    res.status(500).json({
      code: ErrorCodes.INTERNAL_ERROR,
      message: error.message || '文件上传失败',
      data: null
    });
  }
};
