import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../utils/errors.js';
import { RefundService } from '../services/payment/refund.service.js';

/**
 * 获取退款状态（统一按 outRefundNo）
 * GET /api/v1/refunds/:outRefundNo/status
 */
export async function getRefundStatus(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const outRefundNo = req.params.outRefundNo?.trim();

  if (!outRefundNo) {
    return next(new ValidationError('无效的outRefundNo'));
  }

  try {
    const localStatus = await RefundService.getRefundStatusByOutRefundNo(outRefundNo, userId);

    let currentStatus = localStatus;
    let queryTriggered = false;

    if (localStatus.refundStatus === 'pending') {
      queryTriggered = true;
      currentStatus = await RefundService.queryAndSyncByOutRefundNo(outRefundNo);
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        outRefundNo,
        orderId: currentStatus.orderId,
        refundStatus: currentStatus.refundStatus,
        refundedAmount: currentStatus.refundedAmount,
        refundTransactionId: currentStatus.refundTransactionId,
        queryTriggered,
      },
    });
  } catch (error) {
    next(error);
  }
}
