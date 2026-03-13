import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db/index.js';
import { orders, overtimeRecords, payments } from '../../db/schema.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
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

const paymentProvider = createPaymentChannelProvider();

function buildTransactionId(relatedType: PaymentRelatedType, relatedId: number): string {
  const prefix = relatedType === PAYMENT_RELATED_TYPE_ORDER ? PAYMENT_TRADE_PREFIX_ORDER : PAYMENT_TRADE_PREFIX_OVERTIME;
  return `${prefix}_${relatedId}_${Date.now()}_${nanoid(6)}`;
}

function resolveAuthCodeOrThrow(authCode?: string): string {
  const normalized = authCode?.trim();
  if (normalized) {
    return normalized;
  }

  throw new ValidationError('authCode不能为空');
}

function mapPaymentStatus(transactionId: string, payment: typeof payments.$inferSelect): PaymentStatusResult {
  return {
    transactionId,
    relatedType: payment.relatedType,
    relatedId: payment.relatedId,
    paymentStatus: (payment.status ?? PAYMENT_STATUS_PENDING) as PaymentStatus,
  };
}

function isDuplicateEntryError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const anyError = error as {
    code?: string;
    errno?: number;
    message?: string;
  };

  if (anyError.code === 'ER_DUP_ENTRY' || anyError.errno === 1062) {
    return true;
  }

  return typeof anyError.message === 'string' && anyError.message.includes('Duplicate entry');
}

async function findPaymentByTransactionId(transactionId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.transactionId, transactionId))
    .orderBy(desc(payments.createdAt))
    .limit(1);

  if (!payment) {
    throw new NotFoundError('支付单不存在');
  }

  return payment;
}

async function findLatestPaymentByRelated(relatedType: PaymentRelatedType, relatedId: number) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.relatedType, relatedType), eq(payments.relatedId, relatedId)))
    .orderBy(desc(payments.createdAt))
    .limit(1);

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
  static async createPrepay(input: CreatePrepayInput): Promise<CreatePrepayResult> {
    const transactionId = buildTransactionId(input.intent.relatedType, input.intent.relatedId);
    let payment: typeof payments.$inferSelect | undefined;

    try {
      await db.insert(payments).values({
        relatedType: input.intent.relatedType,
        relatedId: input.intent.relatedId,
        paymentMethod: input.paymentMethod,
        transactionId,
        amount: input.intent.amountFen,
        status: PAYMENT_STATUS_PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      payment = await findPaymentByTransactionId(transactionId);
    } catch (error) {
      if (!isDuplicateEntryError(error)) {
        throw error;
      }

      payment = await findLatestPaymentByRelated(input.intent.relatedType, input.intent.relatedId);
      if (!payment) {
        throw new ValidationError('支付单创建失败，请稍后重试');
      }
    }

    if (!payment) {
      throw new ValidationError('支付单创建失败，请稍后重试');
    }

    if (payment.status === PAYMENT_STATUS_SUCCESS) {
      throw new ValidationError('该支付已完成，请勿重复发起');
    }

    if (payment.status === PAYMENT_STATUS_FAILED) {
      throw new ValidationError('该支付状态异常，请联系客服处理');
    }

    if (!payment.transactionId) {
      throw new ValidationError('支付流水号缺失，请稍后重试');
    }

    const code = resolveAuthCodeOrThrow(input.authCode);
    const openid = await openIdProvider.resolveOpenIdByCode(code);

    const upstream = await paymentProvider.createPrepay({
      transactionId: payment.transactionId,
      amountFen: payment.amount,
      openid: openid.openid,
      appId: openid.appId,
      description: input.intent.description,
      clientIp: input.clientIp,
    });

    return {
      relatedType: payment.relatedType,
      relatedId: payment.relatedId,
      transactionId: payment.transactionId,
      paymentStatus: PAYMENT_STATUS_PENDING,
      payParams: upstream.payParams,
    };
  }

  static async getPaymentStatusByTransactionId(transactionId: string, userId: number): Promise<PaymentStatusResult> {
    const payment = await findPaymentByTransactionId(transactionId);
    await assertPaymentOwnership(payment.relatedType, payment.relatedId, userId);
    return mapPaymentStatus(transactionId, payment);
  }

  static async queryAndSyncByTransactionId(transactionId: string, userId?: number): Promise<PaymentStatusResult> {
    const payment = await findPaymentByTransactionId(transactionId);

    if (typeof userId === 'number') {
      await assertPaymentOwnership(payment.relatedType, payment.relatedId, userId);
    }

    if (payment.status !== PAYMENT_STATUS_PENDING) {
      return mapPaymentStatus(transactionId, payment);
    }

    const upstream = await paymentProvider.queryOrder(transactionId);
    if (upstream.status === PAYMENT_STATUS_SUCCESS) {
      await this.confirmPaid(payment.id, upstream);
    }

    const refreshed = await findPaymentByTransactionId(transactionId);
    return mapPaymentStatus(transactionId, refreshed);
  }

  static async handleNotify(input: ProviderNotifyInput): Promise<PaymentStatusResult> {
    const upstream = await paymentProvider.parseNotify(input);

    if (upstream.status === PAYMENT_STATUS_SUCCESS) {
      const payment = await findPaymentByTransactionId(upstream.transactionId);
      await this.confirmPaid(payment.id, upstream);
    }

    const refreshed = await findPaymentByTransactionId(upstream.transactionId);
    return mapPaymentStatus(upstream.transactionId, refreshed);
  }

  static async reconcileBusinessByTransactionId(transactionId: string): Promise<void> {
    const payment = await findPaymentByTransactionId(transactionId);
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
