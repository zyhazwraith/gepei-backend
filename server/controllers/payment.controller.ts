import { NextFunction, Request, Response } from 'express';
import { ValidationError } from '../utils/errors.js';
import { PaymentService } from '../services/payment/payment.service.js';
import { PAYMENT_STATUS_PENDING } from '../constants/payment.js';
import { z } from 'zod';
import { setMockPaymentOrderResult } from '../services/payment/payment-channel.provider.js';

const setMockResultSchema = z.object({
  status: z.enum(['pending', 'success', 'failed']),
  amountFen: z.number().int().positive().optional(),
  transactionId: z.string().trim().min(1).optional(),
  paidAt: z.string().datetime().optional(),
});

/**
 * 获取支付状态（统一按 outTradeNo）
 * GET /api/v1/payments/:outTradeNo/status
 */
export async function getPaymentStatus(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const outTradeNo = req.params.outTradeNo?.trim();

  if (!outTradeNo) {
    return next(new ValidationError('无效的outTradeNo'));
  }

  try {
    const localStatus = await PaymentService.getPaymentStatusByTradeNo(outTradeNo, userId);

    let currentStatus = localStatus;
    let queryTriggered = false;

    if (localStatus.paymentStatus === PAYMENT_STATUS_PENDING) {
      queryTriggered = true;
      currentStatus = await PaymentService.queryAndSyncByTradeNo(outTradeNo, userId);
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        outTradeNo,
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

/**
 * Mock: set query/notify result for a tradeNo
 * POST /api/v1/payments/mock/:outTradeNo/result
 */
export async function setMockPaymentResult(req: Request, res: Response, next: NextFunction) {
  const provider = (process.env.PAYMENT_PROVIDER || 'mock').trim().toLowerCase();
  if (provider !== 'mock') {
    return next(new ValidationError('当前环境未启用Mock支付提供方'));
  }

  const outTradeNo = req.params.outTradeNo?.trim();
  if (!outTradeNo) {
    return next(new ValidationError('无效的outTradeNo'));
  }

  try {
    const validated = setMockResultSchema.parse(req.body);

    setMockPaymentOrderResult({
      outTradeNo,
      status: validated.status,
      amountFen: validated.amountFen,
      transactionId: validated.transactionId,
      paidAt: validated.paidAt ? new Date(validated.paidAt) : undefined,
    });

    res.json({
      code: 0,
      message: 'Mock支付结果设置成功',
      data: {
        outTradeNo,
        status: validated.status,
      },
    });
  } catch (error) {
    next(error);
  }
}
