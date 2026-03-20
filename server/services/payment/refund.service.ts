import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db/index.js';
import { orders, payments, refundRecords } from '../../db/schema.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { PAYMENT_RELATED_TYPE_ORDER, PAYMENT_STATUS_SUCCESS } from '../../constants/payment.js';
import { OrderStatus } from '../../constants/index.js';
import { createPaymentChannelProvider } from './payment-channel.provider.js';
import type { ProviderNotifyInput, ProviderRefundResult } from './payment.types.js';

const paymentProvider = createPaymentChannelProvider();
const PENALTY_FEN = 15000;

export interface RefundApplyResult {
  success: boolean;
  alreadyRefunded?: boolean;
  outRefundNo: string;
  refundStatus: 'pending' | 'success' | 'failed';
  refundedAmount: number;
  penaltyApplied: boolean;
  message: string;
}

export interface RefundStatusResult {
  outRefundNo: string;
  orderId: number;
  refundStatus: 'pending' | 'success' | 'failed';
  refundedAmount: number;
  refundTransactionId?: string;
}

function buildOutRefundNo(orderNumber: string): string {
  return `REF_${orderNumber}_${Date.now()}_${nanoid(4)}`;
}

function buildResult(input: {
  outRefundNo: string;
  refundStatus: 'pending' | 'success' | 'failed';
  refundedAmount: number;
  penaltyApplied: boolean;
  alreadyRefunded?: boolean;
}): RefundApplyResult {
  let message = '退款申请已受理，处理中';
  if (input.refundStatus === 'success') {
    message = input.penaltyApplied
      ? '退款成功，已扣除违约金 ¥150，资金预计1-3个工作日到账'
      : '退款成功，资金预计1-3个工作日到账';
  } else if (input.refundStatus === 'failed') {
    message = '退款申请失败，请联系客服';
  }

  return {
    success: input.refundStatus !== 'failed',
    alreadyRefunded: input.alreadyRefunded,
    outRefundNo: input.outRefundNo,
    refundStatus: input.refundStatus,
    refundedAmount: input.refundedAmount,
    penaltyApplied: input.penaltyApplied,
    message,
  };
}

export class RefundService {
  static async applyByUser(userId: number, orderId: number): Promise<RefundApplyResult> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      throw new NotFoundError('订单不存在');
    }
    if (order.userId !== userId) {
      throw new ForbiddenError('无权操作此订单');
    }

    const [latestRefund] = await db
      .select()
      .from(refundRecords)
      .where(eq(refundRecords.orderId, order.id))
      .orderBy(desc(refundRecords.id))
      .limit(1);

    if (latestRefund?.status === 'pending') {
      return buildResult({
        outRefundNo: latestRefund.outRefundNo || `REF_PENDING_${order.id}`,
        refundStatus: 'pending',
        refundedAmount: latestRefund.amount,
        penaltyApplied: latestRefund.amount < order.amount,
      });
    }

    if (order.status === OrderStatus.REFUNDED || latestRefund?.status === 'success') {
      return buildResult({
        alreadyRefunded: true,
        outRefundNo: latestRefund?.outRefundNo || `REF_DONE_${order.id}`,
        refundStatus: 'success',
        refundedAmount: order.refundAmount || latestRefund?.amount || 0,
        penaltyApplied: (order.refundAmount || latestRefund?.amount || 0) < order.amount,
      });
    }

    if (!order.status || order.status !== OrderStatus.WAITING_SERVICE) {
      throw new ValidationError(`当前订单状态为 ${order.status}，无法申请退款`);
    }
    if (!order.paidAt) {
      throw new ValidationError('订单支付信息缺失');
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.relatedType, PAYMENT_RELATED_TYPE_ORDER),
          eq(payments.relatedId, order.id),
          eq(payments.status, PAYMENT_STATUS_SUCCESS),
        ),
      )
      .orderBy(desc(payments.createdAt))
      .limit(1);

    if (!payment?.transactionId) {
      throw new ValidationError('系统异常：找不到关联的支付流水，请联系客服处理');
    }

    const paidAtTime = new Date(order.paidAt).getTime();
    const hoursSincePaid = (Date.now() - paidAtTime) / (1000 * 60 * 60);
    const penaltyApplied = hoursSincePaid > 1;
    const refundAmount = penaltyApplied ? Math.max(0, order.amount - PENALTY_FEN) : order.amount;
    const reason = penaltyApplied ? '用户自主申请退款（扣除违约金 ¥150）' : '用户自主申请退款（无责）';

    const outRefundNo = buildOutRefundNo(order.orderNumber);
    await db.insert(refundRecords).values({
      orderId: order.id,
      amount: refundAmount,
      reason,
      outRefundNo,
      status: 'pending',
      operatorId: userId,
      createdAt: new Date(),
    });

    const created = await paymentProvider.createRefund({
      outRefundNo,
      transactionId: payment.transactionId,
      amountFen: refundAmount,
      totalAmountFen: order.amount,
      reason,
    });

    let nextStatus = created.status;
    if (created.status === 'success' || created.status === 'failed') {
      const confirmed = await this.confirmRefund(outRefundNo, {
        outRefundNo,
        status: created.status,
        amountFen: refundAmount,
        refundTransactionId: created.refundTransactionId,
        raw: created.raw,
      });
      nextStatus = confirmed.status;
    }

    return buildResult({
      outRefundNo,
      refundStatus: nextStatus,
      refundedAmount: refundAmount,
      penaltyApplied,
    });
  }

  static async confirmRefund(outRefundNo: string, upstream: ProviderRefundResult): Promise<ProviderRefundResult> {
    const result = await db.transaction(async (tx): Promise<ProviderRefundResult> => {
      const [row] = await tx.select().from(refundRecords).where(eq(refundRecords.outRefundNo, outRefundNo)).limit(1);
      if (!row) {
        throw new NotFoundError('退款记录不存在');
      }

      const currentStatus = (row.status || 'pending') as 'pending' | 'success' | 'failed';
      if (currentStatus !== 'pending') {
        return {
          outRefundNo,
          status: currentStatus,
          amountFen: row.amount,
          refundTransactionId: row.refundTransactionId || undefined,
        };
      }

      if (typeof upstream.amountFen === 'number' && upstream.amountFen !== row.amount) {
        throw new ValidationError('退款金额校验失败');
      }

      const [refundUpdate] = await tx
        .update(refundRecords)
        .set({
          status: upstream.status,
          refundTransactionId: upstream.refundTransactionId || row.refundTransactionId,
        })
        .where(and(eq(refundRecords.id, row.id), eq(refundRecords.status, 'pending')));

      if (refundUpdate.affectedRows === 0) {
        return {
          outRefundNo,
          status: 'pending',
          amountFen: row.amount,
        };
      }

      if (upstream.status === 'success') {
        await tx
          .update(orders)
          .set({
            status: OrderStatus.REFUNDED,
            refundAmount: row.amount,
            updatedAt: new Date(),
          })
          .where(and(eq(orders.id, row.orderId), eq(orders.status, OrderStatus.WAITING_SERVICE)));
      }

      return {
        outRefundNo,
        status: upstream.status,
        amountFen: row.amount,
        refundTransactionId: upstream.refundTransactionId || row.refundTransactionId || undefined,
        raw: upstream.raw,
      };
    });

    return result;
  }

  static async handleNotify(input: ProviderNotifyInput): Promise<RefundStatusResult> {
    const upstream = await paymentProvider.parseRefundNotify(input);
    await this.confirmRefund(upstream.outRefundNo, upstream);
    return this.getRefundStatusByOutRefundNo(upstream.outRefundNo);
  }

  static async queryAndSyncByOutRefundNo(outRefundNo: string): Promise<RefundStatusResult> {
    const [row] = await db.select().from(refundRecords).where(eq(refundRecords.outRefundNo, outRefundNo)).limit(1);
    if (!row) {
      throw new NotFoundError('退款记录不存在');
    }

    if ((row.status || 'pending') !== 'pending') {
      return {
        outRefundNo,
        orderId: row.orderId,
        refundStatus: row.status || 'pending',
        refundedAmount: row.amount,
        refundTransactionId: row.refundTransactionId || undefined,
      };
    }

    const upstream = await paymentProvider.queryRefund(outRefundNo);
    if (upstream.status !== 'pending') {
      await this.confirmRefund(outRefundNo, upstream);
    }

    return this.getRefundStatusByOutRefundNo(outRefundNo);
  }

  static async getRefundStatusByOutRefundNo(outRefundNo: string, userId?: number): Promise<RefundStatusResult> {
    const [row] = await db.select().from(refundRecords).where(eq(refundRecords.outRefundNo, outRefundNo)).limit(1);
    if (!row) {
      throw new NotFoundError('退款记录不存在');
    }

    if (typeof userId === 'number') {
      const [order] = await db.select({ id: orders.id, userId: orders.userId }).from(orders).where(eq(orders.id, row.orderId));
      if (!order || order.userId !== userId) {
        throw new ForbiddenError('无权查看该退款状态');
      }
    }

    return {
      outRefundNo,
      orderId: row.orderId,
      refundStatus: row.status || 'pending',
      refundedAmount: row.amount,
      refundTransactionId: row.refundTransactionId || undefined,
    };
  }
}
