import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../utils/errors.js';
import { PaymentService } from '../services/payment/payment.service.js';
import { PAYMENT_STATUS_PENDING } from '../constants/payment.js';

/**
 * 获取支付状态（统一按 transactionId）
 * GET /api/v1/payments/:transactionId/status
 */
export async function getPaymentStatus(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const transactionId = req.params.transactionId?.trim();

  if (!transactionId) {
    return next(new ValidationError('无效的transactionId'));
  }

  try {
    const localStatus = await PaymentService.getPaymentStatusByTransactionId(transactionId, userId);

    let currentStatus = localStatus;
    let queryTriggered = false;

    if (localStatus.paymentStatus === PAYMENT_STATUS_PENDING) {
      queryTriggered = true;
      currentStatus = await PaymentService.queryAndSyncByTransactionId(transactionId, userId);
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        transactionId,
        relatedType: currentStatus.relatedType,
        relatedId: currentStatus.relatedId,
        paymentStatus: currentStatus.paymentStatus,
        queryTriggered,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 微信支付回调（Phase1 骨架）
 * POST /api/v1/payments/wechat/notify
 */
export async function wechatNotify(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await PaymentService.handleNotify({
      headers: req.headers as Record<string, string | string[] | undefined>,
      rawBody: req.body,
      parsedBody: req.body,
    });

    res.json({
      code: 0,
      message: '通知已接收',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
