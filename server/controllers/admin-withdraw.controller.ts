import { Request, Response } from 'express';
import { WithdrawService } from '../services/withdraw.service.js';
import { ValidationError } from '../utils/errors.js';
import { z } from 'zod';
import { WithdrawalStatus } from '../constants/wallet.js';

const auditSchema = z.object({
  status: z.enum([WithdrawalStatus.COMPLETED, WithdrawalStatus.REJECTED]),
  adminNote: z.string().optional(),
});

export class AdminWithdrawController {
  
  /**
   * Get Withdrawals List
   * GET /api/v1/admin/withdrawals
   */
  static async list(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as any;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const keyword = req.query.keyword as string;

    const data = await WithdrawService.getAdminWithdrawals({
      page,
      limit,
      status,
      userId,
      keyword
    });

    res.json({
      code: 0,
      message: 'success',
      data
    });
  }

  /**
   * Audit Withdrawal
   * PUT /api/v1/admin/withdrawals/:id
   */
  static async audit(req: Request, res: Response) {
    const id = parseInt(req.params.id);
    const operatorId = req.user!.id;

    try {
      const validated = auditSchema.parse(req.body);
      const adminNote = validated.adminNote || '';

      await WithdrawService.auditWithdrawal(id, validated.status, adminNote, operatorId);

      res.json({
        code: 0,
        message: 'Audit processed successfully'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('参数错误: ' + error.errors.map(e => e.message).join(', '));
      }
      throw error;
    }
  }
}
