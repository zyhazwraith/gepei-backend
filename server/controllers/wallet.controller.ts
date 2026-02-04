import { Request, Response } from 'express';
import { WalletService } from '../services/wallet.service.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { z } from 'zod';

// Schema for withdraw application
const withdrawSchema = z.object({
  amount: z.number().int().positive('提现金额必须大于0'),
  userNote: z.string().min(1, '收款账号信息不能为空').max(255, '备注信息过长'),
});

export class WalletController {
  
  /**
   * Get Wallet Summary (Balance + Frozen)
   * GET /api/v1/wallet/summary
   */
  static async getSummary(req: Request, res: Response) {
    const userId = req.user!.id;
    const data = await WalletService.getWalletSummary(userId);
    
    res.json({
      code: 0,
      message: 'success',
      data
    });
  }

  /**
   * Get Wallet Logs (Pagination)
   * GET /api/v1/wallet/logs
   */
  static async getLogs(req: Request, res: Response) {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const data = await WalletService.getWalletLogs(userId, page, limit);

    res.json({
      code: 0,
      message: 'success',
      data
    });
  }

  /**
   * Apply for Withdraw
   * POST /api/v1/wallet/withdraw
   */
  static async applyWithdraw(req: Request, res: Response) {
    const userId = req.user!.id;
    
    try {
      const validated = withdrawSchema.parse(req.body);
      
      const withdrawal = await WalletService.applyWithdraw(
        userId, 
        validated.amount, 
        validated.userNote
      );

      res.json({
        code: 0,
        message: '提现申请提交成功',
        data: withdrawal
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError('参数错误: ' + (error as any).errors.map((e: any) => e.message).join(', '));
      }
      throw error;
    }
  }
}
