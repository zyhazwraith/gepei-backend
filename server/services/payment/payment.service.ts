import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db/index.js';
import { orders, overtimeRecords, payments } from '../../db/schema.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { openIdProvider } from './openid.service.js';
import {
  AUTH_CODE_MOCK_FALLBACK,
  OPENID_PROVIDER_MOCK,
  PAYMENT_NOTIFY_PATH,
  PAYMENT_RELATED_TYPE_ORDER,
  PAYMENT_RELATED_TYPE_OVERTIME,
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
  ProviderOrderResult,
} from './payment.types.js';
import { createPaymentChannelProvider } from './payment-channel.provider.js';
import { OrderService } from '../order.service.js';

const paymentProvider = createPaymentChannelProvider();

function buildOutTradeNo(relatedType: PaymentRelatedType, relatedId: number): string {
  const prefix = relatedType === PAYMENT_RELATED_TYPE_ORDER ? PAYMENT_TRADE_PREFIX_ORDER : PAYMENT_TRADE_PREFIX_OVERTIME;
  return `${prefix}_${relatedId}_${Date.now()}_${nanoid(6)}`;
}

function resolveAuthCodeOrThrow(authCode?: string): string {
  const normalized = authCode?.trim();
  if (normalized) {
    return normalized;
  }

  const openidProvider = (process.env.OPENID_PROVIDER || OPENID_PROVIDER_MOCK).trim().toLowerCase();
  if (openidProvider === OPENID_PROVIDER_MOCK) {
    return AUTH_CODE_MOCK_FALLBACK;
  }

  throw new ValidationError('authCode不能为空');
}

function mapPaymentStatus(outTradeNo: string, payment: typeof payments.$inferSelect): PaymentStatusResult {
  return {
    outTradeNo,
    relatedType: payment.relatedType,
    relatedId: payment.relatedId,
    paymentStatus: (payment.status ?? PAYMENT_STATUS_PENDING) as PaymentStatus,
  };
}

async function findLatestPaymentByTradeNo(outTradeNo: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.transactionId, outTradeNo))
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

function resolveNotifyUrl(): string {
  return process.env.WECHAT_NOTIFY_URL?.trim() || PAYMENT_NOTIFY_PATH;
}

export class PaymentService {
  static async createPrepay(input: CreatePrepayInput): Promise<CreatePrepayResult> {
    const code = resolveAuthCodeOrThrow(input.authCode);
    const openid = await openIdProvider.resolveOpenIdByCode(code);
    const outTradeNo = buildOutTradeNo(input.intent.relatedType, input.intent.relatedId);

    await db.insert(payments).values({
      relatedType: input.intent.relatedType,
      relatedId: input.intent.relatedId,
      paymentMethod: input.paymentMethod,
      transactionId: outTradeNo,
      amount: input.intent.amountFen,
      status: PAYMENT_STATUS_PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const upstream = await paymentProvider.createPrepay({
      outTradeNo,
      amountFen: input.intent.amountFen,
      openid: openid.openid,
      appId: openid.appId,
      description: input.intent.description,
      clientIp: input.clientIp,
      notifyUrl: resolveNotifyUrl(),
    });

    return {
      relatedType: input.intent.relatedType,
      relatedId: input.intent.relatedId,
      outTradeNo,
      paymentStatus: PAYMENT_STATUS_PENDING,
      payParams: upstream.payParams,
    };
  }

  static async getPaymentStatusByTradeNo(outTradeNo: string, userId: number): Promise<PaymentStatusResult> {
    const payment = await findLatestPaymentByTradeNo(outTradeNo);
    await assertPaymentOwnership(payment.relatedType, payment.relatedId, userId);
    return mapPaymentStatus(outTradeNo, payment);
  }

  static async queryAndSyncByTradeNo(outTradeNo: string, userId?: number): Promise<PaymentStatusResult> {
    const payment = await findLatestPaymentByTradeNo(outTradeNo);

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

    const refreshed = await findLatestPaymentByTradeNo(outTradeNo);
    return mapPaymentStatus(outTradeNo, refreshed);
  }

  static async handleNotify(input: ProviderNotifyInput): Promise<PaymentStatusResult> {
    const upstream = await paymentProvider.parseNotify(input);

    if (upstream.status === PAYMENT_STATUS_SUCCESS) {
      const payment = await findLatestPaymentByTradeNo(upstream.outTradeNo);
      await this.confirmPaid(payment.id, upstream);
    }

    const refreshed = await findLatestPaymentByTradeNo(upstream.outTradeNo);
    return mapPaymentStatus(upstream.outTradeNo, refreshed);
  }

  private static async confirmPaid(paymentId: number, upstream: ProviderOrderResult): Promise<void> {
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

      if (typeof upstream.amountFen === 'number' && upstream.amountFen !== row.amount) {
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
