import { db } from '../db/index.js';
import { orders, checkInRecords, attachments, overtimeRecords, payments, refundRecords } from '../db/schema.js';
import { eq, and, lt, sql, desc, or } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { nanoid } from 'nanoid';
import { GUIDE_INCOME_RATIO } from '../shared/constants.js';
import { paymentProvider } from './payment/payment.provider.js';
import { OrderStatus } from '../constants/index.js';
import type { PaymentIntent } from './payment/payment.types.js';
import {
  PAYMENT_RELATED_TYPE_ORDER,
  PAYMENT_RELATED_TYPE_OVERTIME,
  PAYMENT_STATUS_PENDING,
} from '../constants/payment.js';

interface CheckInPayload {
  type: 'start' | 'end';
  attachmentId: number;
  lat: number;
  lng: number;
}

function buildServiceEndTimeExtensionSql(durationHours: number) {
  return sql`CASE
    WHEN ${orders.serviceEndTime} IS NOT NULL AND ${orders.serviceEndTime} > NOW()
      THEN DATE_ADD(${orders.serviceEndTime}, INTERVAL ${durationHours} HOUR)
    ELSE DATE_ADD(NOW(), INTERVAL ${durationHours} HOUR)
  END`;
}

export class OrderService {
  static async prepareOrderPaymentIntent(orderId: number, userId: number): Promise<PaymentIntent> {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundError('订单不存在');
    }
    if (order.userId !== userId) {
      throw new ForbiddenError('无权支付此订单');
    }
    if (order.status !== PAYMENT_STATUS_PENDING) {
      throw new ValidationError('订单已支付或状态已变更');
    }

    return {
      relatedType: PAYMENT_RELATED_TYPE_ORDER,
      relatedId: order.id,
      amountFen: order.amount,
      description: `order#${order.id}`,
    };
  }

  static async prepareOvertimePaymentIntent(overtimeId: number, userId: number): Promise<PaymentIntent> {
    const [overtime] = await db.select().from(overtimeRecords).where(eq(overtimeRecords.id, overtimeId));
    if (!overtime) {
      throw new NotFoundError('加时申请不存在');
    }
    if (overtime.status !== PAYMENT_STATUS_PENDING) {
      throw new ValidationError('该加时申请已支付或状态已变更');
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, overtime.orderId));
    if (!order) {
      throw new NotFoundError('关联订单不存在');
    }
    if (order.userId !== userId) {
      throw new ForbiddenError('无权支付此订单');
    }

    return {
      relatedType: PAYMENT_RELATED_TYPE_OVERTIME,
      relatedId: overtime.id,
      amountFen: overtime.fee,
      description: `overtime#${overtime.id}`,
    };
  }

  static async applyOrderPaid(orderId: number, amountFen: number, paidAt: Date): Promise<void> {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
      if (!order) {
        throw new NotFoundError('订单不存在');
      }
      if (order.amount !== amountFen) {
        throw new ValidationError('订单支付金额不一致');
      }

      const [result] = await tx
        .update(orders)
        .set({
          status: 'paid',
          paidAt,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.id, orderId), eq(orders.status, PAYMENT_STATUS_PENDING)));

      if (result.affectedRows === 0) {
        return;
      }
    });
  }

  static async applyOvertimePaid(overtimeId: number, amountFen: number, paidAt: Date): Promise<void> {
    await db.transaction(async (tx) => {
      const [overtime] = await tx.select().from(overtimeRecords).where(eq(overtimeRecords.id, overtimeId));
      if (!overtime) {
        throw new NotFoundError('加时申请不存在');
      }
      if (overtime.fee !== amountFen) {
        throw new ValidationError('加时支付金额不一致');
      }

      const [updateResult] = await tx
        .update(overtimeRecords)
        .set({ status: 'paid' })
        .where(and(eq(overtimeRecords.id, overtimeId), eq(overtimeRecords.status, PAYMENT_STATUS_PENDING)));

      if (updateResult.affectedRows === 0) {
        return;
      }

      const [order] = await tx.select().from(orders).where(eq(orders.id, overtime.orderId));
      if (!order) {
        throw new NotFoundError('关联订单不存在');
      }

      const guideIncomeInc = Math.round(overtime.fee * GUIDE_INCOME_RATIO);

      await tx
        .update(orders)
        .set({
          totalAmount: sql`${orders.totalAmount} + ${overtime.fee}`,
          guideIncome: sql`${orders.guideIncome} + ${guideIncomeInc}`,
          totalDuration: sql`COALESCE(${orders.totalDuration}, ${orders.duration}) + ${overtime.duration}`,
          serviceEndTime: buildServiceEndTimeExtensionSql(overtime.duration),
          updatedAt: paidAt,
        })
        .where(eq(orders.id, order.id));
    });
  }

  /**
   * User Initiated Refund
   */
  static async refundByUser(userId: number, orderId: number) {
    // 1. Fetch Order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    // 2. Eligibility Checks
    if (order.userId !== userId) {
      throw new ForbiddenError('无权操作此订单');
    }

    if (order.status === OrderStatus.REFUNDED) {
      return {
        success: true,
        alreadyRefunded: true,
        refundedAmount: order.refundAmount || 0,
        penaltyApplied: false,
        message: '订单已退款'
      };
    }

    if (!order.status || (order.status !== OrderStatus.PAID && order.status !== OrderStatus.WAITING_SERVICE)) {
      throw new ValidationError(`当前订单状态为 ${order.status}，无法申请退款`);
    }

    if (!order.paidAt) {
      throw new ValidationError('订单支付信息缺失');
    }

    // 3. Find Original Payment Transaction (Strict Check)
    const [payment] = await db.select().from(payments)
      .where(and(
        eq(payments.relatedType, 'order'),
        eq(payments.relatedId, order.id),
        eq(payments.status, 'success')
      ))
      .orderBy(desc(payments.createdAt))
      .limit(1);

    if (!payment || !payment.transactionId) {
      // Critical Data Inconsistency
      throw new Error('系统异常：找不到关联的支付流水，请联系客服处理');
    }
    const originalTransactionId = payment.transactionId;

    // 4. Calculate Refund Amount
    const paidAtTime = new Date(order.paidAt).getTime();
    const nowMs = Date.now();
    const hoursSincePaid = (nowMs - paidAtTime) / (1000 * 60 * 60);

    let refundAmount = order.amount; // Base: Full Refund
    let penalty = 0;
    let reason = '用户自主申请退款（无责）';

    // Rule: > 1 Hour, deduct 150 RMB
    if (hoursSincePaid > 1) {
      penalty = 15000; // 150 RMB in cents
      refundAmount = Math.max(0, order.amount - penalty);
      reason = `用户自主申请退款（扣除违约金 ¥150）`;
    }

    // 5. CAS + Refund (Atomic in mocked stage)
    const outRefundNo = `REF_${order.orderNumber}_${Date.now()}`;
    const now = new Date();

    await db.transaction(async (tx) => {
      // 5.1 CAS: paid|waiting_service -> refunded
      const [updateResult] = await tx.update(orders)
        .set({
          status: OrderStatus.REFUNDED,
          refundAmount: refundAmount,
          updatedAt: now
        })
        .where(and(
          eq(orders.id, order.id),
          or(
            eq(orders.status, OrderStatus.PAID),
            eq(orders.status, OrderStatus.WAITING_SERVICE)
          )
        ));

      if (updateResult.affectedRows === 0) {
        const [latestOrder] = await tx.select().from(orders).where(eq(orders.id, order.id));
        if (latestOrder?.status === OrderStatus.REFUNDED) {
          throw new ValidationError('订单已退款');
        }
        throw new ValidationError(`当前订单状态为 ${latestOrder?.status}，无法申请退款`);
      }

      // 5.2 Process external refund (mock provider in current stage)
      const paymentResult = await paymentProvider.refund(
        order.orderNumber,
        refundAmount,
        originalTransactionId,
        outRefundNo,
        reason
      );

      if (!paymentResult.success) {
        throw new Error('退款请求失败，请联系客服');
      }

      // 5.3 Create refund record
      await tx.insert(refundRecords).values({
        orderId: order.id,
        amount: refundAmount,
        reason: reason,
        outRefundNo: outRefundNo,
        refundTransactionId: paymentResult.refundTransactionId,
        status: 'success',
        operatorId: userId, // User himself
        createdAt: now
      });
    });

    return {
      success: true,
      refundedAmount: refundAmount,
      penaltyApplied: penalty > 0,
      message: penalty > 0 
        ? '退款申请成功，扣除违约金 ¥150，资金预计1-3个工作日到账'
        : '退款申请成功，资金预计1-3个工作日到账'
    };
  }

  /**
   * Get Order Details with Overtime
   */
  static async getOrderDetails(orderId: number) {
    // 1. Fetch Basic Order Info
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!order) {
        throw new NotFoundError('订单不存在');
    }

    // 2. Fetch Paid Overtime Records
    // Since relations might not be configured in schema for db.query, we use manual select
    const paidOvertimeRecords = await db.select()
        .from(overtimeRecords)
        .where(and(
            eq(overtimeRecords.orderId, orderId),
            eq(overtimeRecords.status, 'paid')
        ))
        .orderBy(desc(overtimeRecords.createdAt));

    // 3. Return Combined Result
    return {
        ...order,
        overtimeRecords: paidOvertimeRecords
    };
  }

  /**
   * Check-in (Start/End Service)
   */
  static async checkIn(orderId: number, payload: CheckInPayload) {
    const { type, attachmentId, lat, lng } = payload;

    // 1. Fetch Order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    // 2. Verify Attachment (Optional but recommended)
    // Check if attachment exists and belongs to usage 'check_in'
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, attachmentId));
    if (!attachment) {
        throw new ValidationError('无效的凭证照片');
    }
    if (attachment.usageType !== 'check_in') {
        // Strict check: must be uploaded via check_in usage
        // But for MVP, maybe just warning. Let's enforce it for safety.
        throw new ValidationError('照片用途不符');
    }

    // 3. Execute Transaction
    const result = await db.transaction(async (tx) => {
      // 3.1 CAS status transition
      const nextStatus = type === 'start' ? 'in_service' : 'service_ended';
      const expectedStatus = type === 'start' ? 'waiting_service' : 'in_service';
      
      const updatePayload: any = { 
        status: nextStatus,
        updatedAt: new Date()
      };

      if (type === 'end') {
        updatePayload.actualEndTime = new Date();
      }

      const [updateResult] = await tx.update(orders)
        .set(updatePayload)
        .where(and(
          eq(orders.id, orderId),
          eq(orders.status, expectedStatus)
        ));

      if (updateResult.affectedRows === 0) {
        const [latestOrder] = await tx.select().from(orders).where(eq(orders.id, orderId));
        throw new ValidationError(`当前订单状态为 ${latestOrder?.status}，无法${type === 'start' ? '开始' : '结束'}服务`);
      }

      // 3.2 Insert check-in record only after CAS success
      await tx.insert(checkInRecords).values({
        orderId,
        type,
        attachmentId, // Photo ID
        time: new Date(),
        latitude: lat.toString(),
        longitude: lng.toString(),
      });
      
      return { 
        previousStatus: expectedStatus, 
        currentStatus: nextStatus,
        checkInTime: new Date()
      };
    });

    return result;
  }

  /**
   * Create Overtime Request
   */
  static async createOvertime(orderId: number, duration: number) {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    
    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    if (order.status !== 'in_service') {
      throw new ValidationError('只有服务中的订单可以申请加时');
    }

    // Calculate fee based on snapshot price
    if (!order.pricePerHour) {
        // Fallback or error? Assuming pricePerHour is always set for standard/custom orders in V2
        // But schema says it's nullable. Let's handle it.
        throw new ValidationError('订单未设置小时单价，无法计算加时费');
    }

    const fee = duration * order.pricePerHour;

    // Create pending overtime record
    const [result] = await db.insert(overtimeRecords).values({
        orderId,
        duration,
        fee,
        status: 'pending',
    });

    return {
        overtimeId: result.insertId,
        duration,
        fee,
        pricePerHour: order.pricePerHour
    };
  }

  /**
   * Pay Overtime (Mock)
   */
  static async payOvertime(overtimeId: number, paymentMethod: 'wechat' = 'wechat') {
    // 1. Fetch Overtime Record with Order
    const [overtime] = await db.select().from(overtimeRecords).where(eq(overtimeRecords.id, overtimeId));
    
    if (!overtime) {
        throw new NotFoundError('加时申请不存在');
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, overtime.orderId));
    if (!order) {
      throw new NotFoundError('关联订单不存在');
    }

    // 2. Execute Transaction
    await db.transaction(async (tx) => {
        // 2.1 CAS: pending -> paid
        const [updateResult] = await tx.update(overtimeRecords)
            .set({ status: 'paid' })
            .where(and(
              eq(overtimeRecords.id, overtimeId),
              eq(overtimeRecords.status, 'pending')
            ));

        if (updateResult.affectedRows === 0) {
          throw new ValidationError('该加时申请已支付或状态已变更');
        }

        // 2.2 Update Order Stats (avoid stale serviceEndTime overwrite)
        // Calculate Guide Income Increment
        const guideIncomeInc = Math.round(overtime.fee * GUIDE_INCOME_RATIO);

        await tx.update(orders)
            .set({ 
                // amount (Base Amount) remains unchanged
                totalAmount: sql`${orders.totalAmount} + ${overtime.fee}`,
                guideIncome: sql`${orders.guideIncome} + ${guideIncomeInc}`,
                totalDuration: sql`COALESCE(${orders.totalDuration}, ${orders.duration}) + ${overtime.duration}`,
                serviceEndTime: buildServiceEndTimeExtensionSql(overtime.duration),
                updatedAt: new Date()
            })
            .where(eq(orders.id, order.id));

        // 2.3 Record Payment
        await tx.insert(payments).values({
            amount: overtime.fee,
            paymentMethod,
            status: 'success',
            relatedType: 'overtime',
            relatedId: overtimeId,
            transactionId: `MOCK_OT_${nanoid()}`, // Mock ID
            paidAt: new Date(),
        });
    });

    return { success: true };
  }

  /**
   * Cancel Expired Orders (Scheduled Task)
   * Rule: Created > 60m ago + 15m Grace Period = 75m Threshold
   */
  static async cancelExpiredOrders() {
    const GRACE_PERIOD_MINUTES = 75;
    const deadline = new Date(Date.now() - GRACE_PERIOD_MINUTES * 60 * 1000);

    const result = await db.update(orders)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(and(
        eq(orders.status, 'pending'),
        lt(orders.createdAt, deadline)
      ));

    return result;
  }
}
