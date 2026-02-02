import { db } from '../db';
import { orders, checkInRecords, attachments } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

interface CheckInPayload {
  type: 'start' | 'end';
  attachmentId: number;
  lat: number;
  lng: number;
}

export class OrderService {
  /**
   * Check-in (Start/End Service)
   */
  static async checkIn(orderId: number, guideId: number, payload: CheckInPayload) {
    const { type, attachmentId, lat, lng } = payload;

    // 1. Fetch Order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    // 2. Auth Check (Must be the assigned guide)
    if (order.guideId !== guideId) {
      throw new ForbiddenError('无权操作此订单');
    }

    // 3. Status Transition Logic
    if (type === 'start') {
      if (order.status !== 'waiting_service') {
        throw new ValidationError(`当前订单状态为 ${order.status}，无法开始服务`);
      }
    } else if (type === 'end') {
      if (order.status !== 'in_service') {
        throw new ValidationError(`当前订单状态为 ${order.status}，无法结束服务`);
      }
    }

    // 4. Verify Attachment (Optional but recommended)
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

    // 5. Execute Transaction
    const result = await db.transaction(async (tx) => {
      // 5.1 Insert Check-in Record
      await tx.insert(checkInRecords).values({
        orderId,
        type,
        attachmentId, // Photo ID
        time: new Date(),
        latitude: lat.toString(),
        longitude: lng.toString(),
      });

      // 5.2 Update Order Status
      const nextStatus = type === 'start' ? 'in_service' : 'service_ended';
      
      await tx.update(orders)
        .set({ 
          status: nextStatus,
          updatedAt: new Date()
        })
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
