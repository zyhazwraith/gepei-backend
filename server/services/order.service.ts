import { db } from '../db';
import { orders, checkInRecords, attachments, overtimeRecords, payments } from '../db/schema';
import { eq, and, lt, sql, desc } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { nanoid } from 'nanoid';
import { PLATFORM_COMMISSION_RATE } from '../shared/constants';

interface CheckInPayload {
  type: 'start' | 'end';
  attachmentId: number;
  lat: number;
  lng: number;
}

export class OrderService {
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

    // 2. Status Transition Logic
    if (type === 'start') {
      if (order.status !== 'waiting_service') {
        throw new ValidationError(`当前订单状态为 ${order.status}，无法开始服务`);
      }
    } else if (type === 'end') {
      if (order.status !== 'in_service') {
        throw new ValidationError(`当前订单状态为 ${order.status}，无法结束服务`);
      }
    }

    // 3. Verify Attachment (Optional but recommended)
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

    // 4. Execute Transaction
    const result = await db.transaction(async (tx) => {
      // 4.1 Insert Check-in Record
      await tx.insert(checkInRecords).values({
        orderId,
        type,
        attachmentId, // Photo ID
        time: new Date(),
        latitude: lat.toString(),
        longitude: lng.toString(),
      });

      // 4.2 Update Order Status
      const nextStatus = type === 'start' ? 'in_service' : 'service_ended';
      
      const updatePayload: any = { 
        status: nextStatus,
        updatedAt: new Date()
      };

      if (type === 'end') {
        updatePayload.actualEndTime = new Date();
      }

      // Removed auto-update of serviceEndTime logic based on feedback

      await tx.update(orders)
        .set(updatePayload)
        .where(eq(orders.id, orderId));
      
      return { 
        previousStatus: order.status, 
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

    if (overtime.status !== 'pending') {
        throw new ValidationError('该加时申请状态不正确');
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, overtime.orderId));

    // 2. Execute Transaction
    await db.transaction(async (tx) => {
        // 2.1 Mark Overtime as Paid
        await tx.update(overtimeRecords)
            .set({ status: 'paid' })
            .where(eq(overtimeRecords.id, overtimeId));

        // 2.2 Update Order Stats
        // New End Time = MAX(OldEndTime, NOW()) + Duration
        const now = new Date();
        const oldEndTime = order.serviceEndTime ? new Date(order.serviceEndTime) : now;
        const baseTime = oldEndTime > now ? oldEndTime : now;
        const newEndTime = new Date(baseTime.getTime() + overtime.duration * 60 * 60 * 1000);

        // Calculate Guide Income Increment
        const guideIncomeInc = Math.round(overtime.fee * (1 - PLATFORM_COMMISSION_RATE));

        await tx.update(orders)
            .set({ 
                // amount (Base Amount) remains unchanged
                totalAmount: sql`${orders.totalAmount} + ${overtime.fee}`,
                guideIncome: sql`${orders.guideIncome} + ${guideIncomeInc}`,
                totalDuration: sql`COALESCE(${orders.totalDuration}, ${orders.duration}) + ${overtime.duration}`,
                serviceEndTime: newEndTime,
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
