import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../utils/errors.js';
import { PaymentService } from '../services/payment/payment.service.js';
import { PAYMENT_STATUS_PENDING } from '../constants/payment.js';
import { logger } from '../lib/logger.js';
import { buildOpenIdSessionKey } from '../services/payment/openid-session-key.js';
import { RefundService } from '../services/payment/refund.service.js';

const bindOpenIdSchema = z.object({
  authCode: z.string().trim().min(1, 'authCode不能为空'),
});

export async function bindSessionOpenId(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;

  try {
    const validated = bindOpenIdSchema.parse(req.body);
    const sessionKey = buildOpenIdSessionKey(userId, req.headers.authorization);
    await PaymentService.bindSessionOpenIdByCode({
      userId,
      sessionKey,
      authCode: validated.authCode,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({
      code: 0,
      message: '绑定成功',
      data: { bound: true },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = (error as any).errors?.[0]?.message || '参数校验失败';
      return next(new ValidationError(msg));
    }
    next(error);
  }
}

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
 * 微信支付回调（Phase3 协议）
 * POST /wechat/pay/notify
 */
export async function wechatNotify(req: Request, res: Response, _next: NextFunction) {
  try {
    const rawBody = req.body as Buffer;

    await PaymentService.handleNotify({
      headers: req.headers as Record<string, string | string[] | undefined>,
      rawBody,
    });

    res.status(200).json({
      code: 'SUCCESS',
      message: '成功',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('wechat_notify_failed', errorMessage);
    res.status(200).json({
      code: 'FAIL',
      message: errorMessage,
    });
  }
}

/**
 * 微信退款回调
 * POST /wechat/pay/refund-notify
 */
export async function wechatRefundNotify(req: Request, res: Response, _next: NextFunction) {
  try {
    const rawBody = req.body as Buffer;

    await RefundService.handleNotify({
      headers: req.headers as Record<string, string | string[] | undefined>,
      rawBody,
    });

    res.status(200).json({
      code: 'SUCCESS',
      message: '成功',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('wechat_refund_notify_failed', errorMessage);
    res.status(200).json({
      code: 'FAIL',
      message: errorMessage,
    });
  }
}
