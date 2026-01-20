import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { orders, users, customRequirements } from '../db/schema';
import { eq, desc, count, like, or } from 'drizzle-orm';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../utils/errors';

// 更新状态 Schema
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'in_progress', 'completed', 'cancelled']),
  force: z.boolean().optional(),
});

// 状态流转规则
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['in_progress', 'cancelled'], // 允许退款取消
  in_progress: ['completed', 'paid'], // 允许回退到paid
  completed: [], // 终态
  cancelled: [], // 终态
};

/**
 * 获取所有订单列表 (管理员)
 */
export async function getOrders(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  try {
    // 1. 查询总数
    const [{ value: total }] = await db.select({ value: count() }).from(orders);

    // 2. 分页查询
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
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

    // 3. 补充定制信息
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
      data: {
        list: enrichedOrders,
        pagination: {
          total,
          page,
          page_size: limit,
          total_pages: Math.ceil(total / limit)
        }
      },
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

    // 状态流转校验 (除非强制)
    if (!validated.force) {
      const allowed = VALID_TRANSITIONS[order.status] || [];
      if (!allowed.includes(validated.status)) {
        throw new ValidationError(
          `非法状态流转: ${order.status} -> ${validated.status}。允许的目标状态: ${allowed.join(', ')}`
        );
      }
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
      return next(new ValidationError('参数错误'));
    }
    next(error);
  }
}

/**
 * 获取所有用户列表 (管理员)
 */
export async function getUsers(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const keyword = req.query.keyword as string;
  const offset = (page - 1) * limit;

  try {
    // 构建查询条件
    const whereCondition = keyword 
      ? or(like(users.phone, `%${keyword}%`), like(users.nickname, `%${keyword}%`))
      : undefined;

    // 1. 查询总数
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(users)
      .where(whereCondition);

    // 2. 分页查询
    const userList = await db.select({
      id: users.id,
      phone: users.phone,
      nickname: users.nickname,
      role: users.role,
      isGuide: users.isGuide,
      balance: users.balance,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(whereCondition)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: userList,
        pagination: {
          total,
          page,
          page_size: limit,
          total_pages: Math.ceil(total / limit)
        }
      },
    });
  } catch (error) {
    throw error;
  }
}
