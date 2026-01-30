import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { orders, users, guides } from '../db/schema';
import { eq, desc, count, like, or, inArray, and } from 'drizzle-orm';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { MAX_GUIDE_SELECTION } from '../../shared/constants.js';
import { createCustomOrderSchema } from '../schemas/admin.schema.js';
import { nanoid } from 'nanoid';

// 更新状态 Schema
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'waiting_service', 'in_service', 'service_ended', 'completed', 'cancelled', 'refunded']),
  force: z.boolean().optional(),
});

// 状态流转规则 (Updated for V2)
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'waiting_service', 'cancelled'], // waiting_service for custom orders assigned directly
  paid: ['in_service', 'cancelled', 'refunded'], // Standard order paid -> in_service
  waiting_service: ['in_service', 'cancelled'],
  in_service: ['service_ended', 'completed', 'cancelled'], // service_ended by guide/user?
  service_ended: ['completed'],
  completed: [], // 终态
  cancelled: ['pending'], // 允许重启
  refunded: [], // 终态
};

/**
 * 获取所有订单列表 (管理员)
 */
export async function getOrders(req: Request, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const keyword = req.query.keyword as string;
  const offset = (page - 1) * limit;

  try {
    // 构建查询条件
    const conditions = [];
    if (keyword) {
      conditions.push(
        or(
          like(orders.orderNumber, `%${keyword}%`),
          like(users.phone, `%${keyword}%`),
          like(users.nickname, `%${keyword}%`)
        )
      );
    }
    
    // 1. 查询总数
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id)) // 必须 join 才能搜 phone
      .where(and(...conditions));

    // 2. 分页查询
    const allOrders = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      orderType: orders.type, // V2: type
      status: orders.status,
      amount: orders.amount,
      serviceStartTime: orders.serviceStartTime,
      createdAt: orders.createdAt,
      userPhone: users.phone,
      userNickname: users.nickname,
      content: orders.content,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

    // 3. 补充定制信息
    const enrichedOrders = allOrders.map((order) => {
      let extra = {};
      if (order.orderType === 'custom' && order.content) {
         try {
            const contentObj = JSON.parse(order.content as string);
            extra = { content: contentObj }; 
         } catch (e) {
            extra = { content: order.content };
         }
      }
      return { ...order, ...extra };
    });

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

// 指派地陪相关逻辑已移除


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
      userNickname: users.nickname,
      // avatarId: users.avatarId, // Removed from users
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

// --------------------------------------------------------------------------
// 指派地陪 (V2 Refactor)
// --------------------------------------------------------------------------
export const createCustomOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createCustomOrderSchema.parse(req.body);
    const creatorId = req.user!.id; // Current Admin/CS ID

    // 1. 验证用户是否存在
    const [user] = await db.select().from(users).where(eq(users.phone, validated.userPhone));
    if (!user) {
      throw new NotFoundError('用户不存在，请先引导用户注册');
    }

    // 2. 验证地陪是否存在 (By Phone)
    const [guideUser] = await db.select({ id: users.id, userId: guides.userId })
        .from(users)
        .leftJoin(guides, eq(users.id, guides.userId))
        .where(eq(users.phone, validated.guidePhone));

    if (!guideUser || !guideUser.userId) {
      throw new NotFoundError('指定的地陪不存在或未认证');
    }
    const guideId = guideUser.userId;

    // 3. 计算金额 (Direct Cents)
    // Spec: Amount = PricePerHour * Duration
    const priceInCents = validated.pricePerHour; // Already in Cents
    const totalAmount = priceInCents * validated.duration;

    // 4. 创建订单
    const orderNumber = `ORD${Date.now()}${nanoid(6).toUpperCase()}`;
    
    const [result] = await db.insert(orders).values({
      orderNumber,
      userId: user.id,
      guideId: guideId,
      creatorId,
      type: 'custom',
      status: 'pending', // 待支付
      
      // 金额与时长
      pricePerHour: priceInCents,
      duration: validated.duration,
      amount: totalAmount,
      
      // 服务信息
      serviceStartTime: new Date(validated.serviceStartTime),
      serviceAddress: validated.serviceAddress,
      content: validated.content,
      requirements: validated.requirements,
      
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      code: 0,
      message: '定制订单创建成功',
      data: {
        orderId: result.insertId,
        orderNumber,
        status: 'pending',
        amount: totalAmount, // Cents
        pricePerHour: priceInCents, // Cents
        duration: validated.duration
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError('参数校验失败: ' + error.message));
    }
    next(error);
  }
};

export const assignGuide = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { guideIds } = req.body; // V2: Array of guide IDs (but only 1 allowed for custom now)
    
    const orderId = parseInt(id);
    
    // 1. 检查订单
    const [order] = await db.select({
        id: orders.id,
        type: orders.type,
        status: orders.status
    }).from(orders).where(eq(orders.id, orderId));

    if (!order) {
        throw new NotFoundError('订单不存在');
    }

    // 2. 检查地陪有效性
    if (!guideIds || !Array.isArray(guideIds) || guideIds.length === 0) {
        throw new ValidationError('请选择至少一个地陪');
    }

    const validGuides = await db.select({ id: guides.userId }).from(guides).where(inArray(guides.userId, guideIds));
    if (validGuides.length !== guideIds.length) {
        throw new ValidationError('部分地陪不存在或无效');
    }

    // 3. 状态校验
    if (order.status !== 'pending' && order.status !== 'paid') {
        // Allow assigning if paid or pending (depending on flow)
        // For custom orders, usually assigned by admin after user requirement submission (pending)
    }

    // 4. 根据订单类型处理
    if (order.type === 'custom') {
        // 定制单：V2 直接指派地陪 (废弃候选人模式)
        if (guideIds.length !== 1) {
            throw new ValidationError('V2 定制订单只能指派一个地陪');
        }
        
        const guideId = guideIds[0];

        // 更新状态
        await db.update(orders)
            .set({ 
                guideId: guideId,
                status: 'waiting_service', // V2 status
                updatedAt: new Date(),
            })
            .where(eq(orders.id, orderId));
            
        res.json({
            code: 0,
            message: '指派成功',
            data: {
                orderId,
                guideIds,
                status: 'waiting_service'
            }
        });

    } else {
        throw new ValidationError('普通订单不可指派候选人');
    }
}

