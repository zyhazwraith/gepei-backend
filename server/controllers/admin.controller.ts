import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { orders, users, customRequirements } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../utils/errors';

// 更新状态 Schema
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'in_progress', 'completed', 'cancelled']),
});

/**
 * 获取所有订单列表 (管理员)
 */
export async function getOrders(req: Request, res: Response) {
  try {
    // 1. 查询所有订单，按时间倒序
    const allOrders = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      orderType: orders.orderType,
      status: orders.status,
      amount: orders.amount,
      serviceDate: orders.serviceDate,
      createdAt: orders.createdAt,
      userPhone: users.phone,
      userNickname: users.nickname,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt));

    // 2. 补充定制信息 (简单处理 N+1，MVP 阶段可接受)
    const enrichedOrders = await Promise.all(allOrders.map(async (order) => {
      let extra = {};
      if (order.orderType === 'custom') {
        const [req] = await db.select().from(customRequirements).where(eq(customRequirements.orderId, order.id));
        if (req) {
          extra = { destination: req.destination, content: req.specialRequirements };
        }
      }
      return { ...order, ...extra };
    }));

    res.json({
      code: 0,
      message: '获取成功',
      data: enrichedOrders,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * 更新订单状态 (管理员)
 */
export async function updateOrderStatus(req: Request, res: Response, next: NextFunction) {
  const orderId = parseInt(req.params.id);
  
  try {
    const validated = updateStatusSchema.parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    await db.update(orders)
      .set({ status: validated.status })
      .where(eq(orders.id, orderId));

    res.json({
      code: 0,
      message: '状态更新成功',
      data: { id: orderId, status: validated.status }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError('无效的状态值'));
    }
    next(error);
  }
}
