import { and, desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db/index.js';
import { orders, overtimeRecords, payments } from '../../db/schema.js';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { openIdProvider } from './openid.service.js';
import {
  PAYMENT_RELATED_TYPE_ORDER,
  PAYMENT_RELATED_TYPE_OVERTIME,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
  PAYMENT_TRADE_PREFIX_ORDER,
  PAYMENT_TRADE_PREFIX_OVERTIME,
} from '../../constants/payment.js';
import type {
  CreatePrepayInput,
  CreatePrepayResult,
  PaymentRelatedType,
  PaymentStatus,
  PaymentStatusResult,
  ProviderNotifyInput,
  ProviderPaymentResult,
} from './payment.types.js';
import { createPaymentChannelProvider } from './payment-channel.provider.js';
import { OrderService } from '../order.service.js';
import { ErrorCodes } from '../../../shared/errorCodes.js';
import { bindSessionOpenId, getSessionOpenId } from './openid-session.store.js';
import { hashOpenId } from './openid-session-key.js';
import { logger } from '../../lib/logger.js';

const paymentProvider = createPaymentChannelProvider();

function buildTransactionId(relatedType: PaymentRelatedType, relatedId: number): string {
  const prefix = relatedType === PAYMENT_RELATED_TYPE_ORDER ? PAYMENT_TRADE_PREFIX_ORDER : PAYMENT_TRADE_PREFIX_OVERTIME;
  return `${prefix}_${relatedId}_${Date.now()}_${nanoid(6)}`;
}

function resolveAuthCode(authCode?: string): string | null {
  const normalized = authCode?.trim();
  if (normalized) {
    return normalized;
  }
  return null;
}

function mapPaymentStatus(outTradeNo: string, payment: typeof payments.$inferSelect): PaymentStatusResult {
  return {
    outTradeNo,
    relatedType: payment.relatedType,
    relatedId: payment.relatedId,
    paymentStatus: (payment.status ?? PAYMENT_STATUS_PENDING) as PaymentStatus,
  };
}

async function findPaymentByOutTradeNo(outTradeNo: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.outTradeNo, outTradeNo))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (!payment) {
    throw new NotFoundError('支付单不存在');
  }

  return payment;
}

async function assertPaymentOwnership(relatedType: PaymentRelatedType, relatedId: number, userId: number): Promise<void> {
  if (relatedType === PAYMENT_RELATED_TYPE_ORDER) {
    const [order] = await db.select().from(orders).where(eq(orders.id, relatedId));
    if (!order) {
      throw new NotFoundError('订单不存在');
    }
    if (order.userId !== userId) {
      throw new ForbiddenError('无权查看该支付状态');
    }
    return;
  }

  const [overtime] = await db.select().from(overtimeRecords).where(eq(overtimeRecords.id, relatedId));
  if (!overtime) {
    throw new NotFoundError('加时申请不存在');
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, overtime.orderId));
  if (!order) {
    throw new NotFoundError('关联订单不存在');
  }

  if (order.userId !== userId) {
    throw new ForbiddenError('无权查看该支付状态');
  }
}

export class PaymentService {
  static async bindSessionOpenIdByCode(input: { userId: number; sessionKey: string; authCode: string; ip?: string; userAgent?: string }): Promise<void> {
    const { userId, sessionKey, authCode, ip, userAgent } = input;
    const code = authCode.trim();
    if (!code) {
      throw new ValidationError('authCode不能为空');
    }
    const resolved = await openIdProvider.resolveOpenIdByCode(code);
    bindSessionOpenId(sessionKey, resolved.openid, resolved.appId);
    logger.security(
      `openid_session_bind ${logger.kv({
        uid: userId,
        sid: sessionKey,
        appId: resolved.appId,
        openidHash: hashOpenId(resolved.openid),
        ip: ip ?? '-',
        ua: userAgent ?? '-',
      })}`,
    );
  }

  static async createPrepay(input: CreatePrepayInput): Promise<CreatePrepayResult> {
    const payment = await db.transaction(async (tx) => {
      // Lock parent business row to serialize concurrent pay requests for the same order/overtime.
      if (input.intent.relatedType === PAYMENT_RELATED_TYPE_ORDER) {
        await tx.execute(sql`SELECT id FROM orders WHERE id = ${input.intent.relatedId} FOR UPDATE`);
      } else {
        await tx.execute(sql`SELECT id FROM overtime_records WHERE id = ${input.intent.relatedId} FOR UPDATE`);
      }

      const [existed] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.relatedType, input.intent.relatedType), eq(payments.relatedId, input.intent.relatedId)))
        .orderBy(desc(payments.createdAt))
        .limit(1);

      if (existed) {
        return existed;
      }

      const outTradeNo = buildTransactionId(input.intent.relatedType, input.intent.relatedId);
      await tx.insert(payments).values({
        relatedType: input.intent.relatedType,
        relatedId: input.intent.relatedId,
        paymentMethod: input.paymentMethod,
        outTradeNo,
        amount: input.intent.amountFen,
        status: PAYMENT_STATUS_PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const [created] = await tx.select().from(payments).where(eq(payments.outTradeNo, outTradeNo)).limit(1);
      if (!created) {
        throw new ValidationError('支付单创建失败，请稍后重试');
      }
      return created;
    });

    if (!payment) {
      throw new ValidationError('支付单创建失败，请稍后重试');
    }

    if (payment.status === PAYMENT_STATUS_SUCCESS) {
      throw new ValidationError('该支付已完成，请勿重复发起');
    }

    if (payment.status === PAYMENT_STATUS_FAILED) {
      throw new ValidationError('该支付状态异常，请联系客服处理');
    }

    if (!payment.outTradeNo) {
      throw new ValidationError('支付流水号缺失，请稍后重试');
    }

    const code = resolveAuthCode(input.authCode);
    let openid = getSessionOpenId(input.sessionKey);

    if (code) {
      const resolved = await openIdProvider.resolveOpenIdByCode(code);
      bindSessionOpenId(input.sessionKey, resolved.openid, resolved.appId);
      logger.security(
        `openid_session_bind_via_prepay ${logger.kv({
          uid: input.userId,
          sid: input.sessionKey,
          appId: resolved.appId,
          openidHash: hashOpenId(resolved.openid),
          ip: input.clientIp ?? '-',
        })}`,
      );
      openid = resolved;
    }

    if (!openid) {
      throw new AppError('授权已失效，请重新进入支付页面', ErrorCodes.WECHAT_REAUTH_REQUIRED, 400);
    }

    const upstream = await paymentProvider.createPrepay({
      outTradeNo: payment.outTradeNo,
      amountFen: payment.amount,
      openid: openid.openid,
      appId: openid.appId,
      description: input.intent.description,
      clientIp: input.clientIp,
    });

    return {
      relatedType: payment.relatedType,
      relatedId: payment.relatedId,
      outTradeNo: payment.outTradeNo,
      paymentStatus: PAYMENT_STATUS_PENDING,
      payParams: upstream.payParams,
    };
  }

  static async getPaymentStatusByOutTradeNo(outTradeNo: string, userId: number): Promise<PaymentStatusResult> {
    const payment = await findPaymentByOutTradeNo(outTradeNo);
    await assertPaymentOwnership(payment.relatedType, payment.relatedId, userId);
    return mapPaymentStatus(outTradeNo, payment);
  }

  static async queryAndSyncByOutTradeNo(outTradeNo: string, userId?: number): Promise<PaymentStatusResult> {
    const payment = await findPaymentByOutTradeNo(outTradeNo);

    if (typeof userId === 'number') {
      await assertPaymentOwnership(payment.relatedType, payment.relatedId, userId);
    }

    if (payment.status !== PAYMENT_STATUS_PENDING) {
      return mapPaymentStatus(outTradeNo, payment);
    }

    const upstream = await paymentProvider.queryOrder(outTradeNo);
    if (upstream.status === PAYMENT_STATUS_SUCCESS) {
      await this.confirmPaid(payment.id, upstream);
    }

    const refreshed = await findPaymentByOutTradeNo(outTradeNo);
    return mapPaymentStatus(outTradeNo, refreshed);
  }

  static async handleNotify(input: ProviderNotifyInput): Promise<PaymentStatusResult> {
    const upstream = await paymentProvider.parseNotify(input);

    if (upstream.status === PAYMENT_STATUS_SUCCESS) {
      const payment = await findPaymentByOutTradeNo(upstream.outTradeNo);
      await this.confirmPaid(payment.id, upstream);
    }

    const refreshed = await findPaymentByOutTradeNo(upstream.outTradeNo);
    return mapPaymentStatus(upstream.outTradeNo, refreshed);
  }

  static async reconcileBusinessByOutTradeNo(outTradeNo: string): Promise<void> {
    const payment = await findPaymentByOutTradeNo(outTradeNo);
    if (payment.status !== PAYMENT_STATUS_SUCCESS) {
      return;
    }

    const paidAt = payment.paidAt || payment.updatedAt || new Date();
    await this.dispatchApplyPaid(payment.relatedType, payment.relatedId, payment.amount, paidAt);
  }

  private static async confirmPaid(paymentId: number, upstream: ProviderPaymentResult): Promise<void> {
    const changedRow = await db.transaction(async (tx): Promise<{
      relatedType: PaymentRelatedType;
      relatedId: number;
      amount: number;
      paidAt: Date;
    } | null> => {
      const [row] = await tx.select().from(payments).where(eq(payments.id, paymentId));
      if (!row) {
        throw new NotFoundError('支付单不存在');
      }

      const currentStatus = (row.status ?? PAYMENT_STATUS_PENDING) as PaymentStatus;
      if (currentStatus !== PAYMENT_STATUS_PENDING) {
        return null;
      }

      if (typeof upstream.amountFen !== 'number') {
        throw new ValidationError('支付金额缺失');
      }

      if (upstream.amountFen !== row.amount) {
        throw new ValidationError('支付金额校验失败');
      }

      const paidAt = upstream.paidAt || new Date();

      const [result] = await tx
        .update(payments)
        .set({
          status: PAYMENT_STATUS_SUCCESS,
          paidAt,
          updatedAt: new Date(),
        })
        .where(and(eq(payments.id, paymentId), eq(payments.status, PAYMENT_STATUS_PENDING)));

      if (result.affectedRows === 0) {
        return null;
      }

      return {
        relatedType: row.relatedType,
        relatedId: row.relatedId,
        amount: row.amount,
        paidAt,
      };
    });

    if (changedRow) {
      await this.dispatchApplyPaid(changedRow.relatedType, changedRow.relatedId, changedRow.amount, changedRow.paidAt);
    }
  }

  private static async dispatchApplyPaid(
    relatedType: PaymentRelatedType,
    relatedId: number,
    amountFen: number,
    paidAt: Date,
  ): Promise<void> {
    if (relatedType === PAYMENT_RELATED_TYPE_ORDER) {
      await OrderService.applyOrderPaid(relatedId, amountFen, paidAt);
      return;
    }

    if (relatedType === PAYMENT_RELATED_TYPE_OVERTIME) {
      await OrderService.applyOvertimePaid(relatedId, amountFen, paidAt);
      return;
    }
  }
}
