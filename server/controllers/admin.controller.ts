import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { orders, users, customRequirements, guides, customOrderCandidates } from '../db/schema';
import { eq, desc, count, like, or, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../utils/errors';
import { MAX_GUIDE_SELECTION } from '../../shared/constants';

// 更新状态 Schema
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'waiting_for_user', 'in_progress', 'completed', 'cancelled']),
  force: z.boolean().optional(),
});

// 状态流转规则
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'waiting_for_user', 'cancelled'],
  waiting_for_user: ['in_progress', 'cancelled'],
  paid: ['in_progress', 'cancelled'], // 允许退款取消
  in_progress: ['completed', 'paid'], // 允许回退到paid
  completed: [], // 终态
  cancelled: ['pending'], // 允许重启订单（用于测试或特殊场景）
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
      const currentStatus = order.status || 'pending';
      const allowed = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(validated.status)) {
        throw new ValidationError(
          `非法状态流转: ${currentStatus} -> ${validated.status}。允许的目标状态: ${allowed.join(', ')}`
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

// 指派地陪 Schema
const assignGuideSchema = z.object({
  guideIds: z.array(z.number().int().positive()),
});

/**
 * 指派地陪 (管理员)
 */
export async function assignGuide(req: Request, res: Response, next: NextFunction) {
  const orderId = parseInt(req.params.id);

  try {
    const { guideIds } = assignGuideSchema.parse(req.body);

    if (guideIds.length === 0) {
        throw new ValidationError('请至少选择一个地陪');
    }

    // 1. 检查订单是否存在
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    // 2. 检查订单状态是否允许指派
    // 允许的状态: waiting_for_guide (定制单初始态), paid (普通单支付后), pending (特殊情况), waiting_for_user (允许重新指派)
    const allowedStatuses = ['waiting_for_guide', 'paid', 'pending', 'waiting_for_user'];
    if (!order.status || !allowedStatuses.includes(order.status)) {
      throw new ValidationError(`当前订单状态 (${order.status}) 不允许指派地陪`);
    }

    // 3. 检查地陪是否存在
    const validGuides = await db.select().from(guides).where(inArray(guides.id, guideIds));
    if (validGuides.length !== guideIds.length) {
        throw new ValidationError('部分地陪不存在');
    }

    // 4. 根据订单类型处理
    if (order.orderType === 'custom') {
        // 定制单：指派候选人
        if (guideIds.length > MAX_GUIDE_SELECTION) {
            throw new ValidationError(`最多只能选择${MAX_GUIDE_SELECTION}个候选地陪`);
        }

        // 清除旧候选人
        await db.delete(customOrderCandidates).where(eq(customOrderCandidates.orderId, orderId));

        // 插入新候选人
        await db.insert(customOrderCandidates).values(
            guideIds.map((gid, index) => ({
                orderId,
                guideId: gid,
                sortOrder: index,
                isSelected: false // default false
            }))
        );

        // 更新状态
        await db.update(orders)
            .set({ 
                status: 'waiting_for_user',
                updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));
            
        res.json({
            code: 0,
            message: '指派成功',
            data: {
                orderId,
                guideIds,
                status: 'waiting_for_user'
            }
        });

    } else {
        // 普通单：直接指派
        if (guideIds.length !== 1) {
            throw new ValidationError('普通订单只能指派一个地陪');
        }
        
        const guideId = guideIds[0];
        
        await db.update(orders)
            .set({ 
                guideId: guideId,
                status: 'in_progress', // 对应 "booked" / "待服务"
                updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));

        res.json({
            code: 0,
            message: '指派成功',
            data: {
                orderId,
                guideIds,
                status: 'in_progress'
            }
        });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = (error as any).errors.map((e: any) => e.message).join(', ');
      return next(new ValidationError(`参数错误: ${msg}`));
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