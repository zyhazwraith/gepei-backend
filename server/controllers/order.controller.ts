import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { orders, payments, users, guides } from '../db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { AppError, NotFoundError, ValidationError } from '../utils/errors.js';
import { ErrorCodes } from '../../shared/errorCodes.js';

// 验证 Schema
const createCustomOrderSchema = z.object({
  // Common fields
  serviceStartTime: z.string().datetime({ message: '无效的时间格式 (ISO 8601)' }),
  serviceAddress: z.string().min(1, '服务地点不能为空'),
  serviceLat: z.number().min(-90).max(90),
  serviceLng: z.number().min(-180).max(180),
  duration: z.number().int().min(1).default(8), // Add duration with default 8
  
  // Custom specific fields
  city: z.string().min(1, '城市不能为空'),
  content: z.string().min(1, '服务内容不能为空'),
  budget: z.number().min(0, '预算必须大于等于0'),
  requirements: z.string().optional(),
});

// 普通订单 Schema
const createNormalOrderSchema = z.object({
  guideId: z.number().int().positive(),
  serviceStartTime: z.string().datetime({ message: '无效的时间格式 (ISO 8601)' }),
  duration: z.number().int().min(1, '服务时长至少1小时'),
  serviceAddress: z.string().min(1, '服务地点不能为空'),
  serviceLat: z.number().min(-90).max(90),
  serviceLng: z.number().min(-180).max(180),
  requirements: z.string().optional(),
});

// 模拟支付 Schema
const payOrderSchema = z.object({
  paymentMethod: z.enum(['wechat']),
});

// 选择地陪 Schema
const selectGuideSchema = z.object({
  guideId: z.number().int().positive(),
});

/**
 * 创建订单 (支持 custom 和 normal)
 */
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  console.log('createOrder body:', req.body);
  
  try {
    // 1. 判断订单类型 (显式检查 type 字段)
    const { type } = req.body;
    
    // 兼容旧逻辑：如果没有传 type，则根据 guideId 判断（但在新版前端发布后应强制要求 type）
    const isCustom = type === 'custom' || (!type && !req.body.guideId);
    const isNormal = type === 'normal' || (!type && req.body.guideId);

    if (!isCustom && !isNormal) {
        throw new ValidationError('无效的订单类型');
    }

    if (isCustom) {
      // === 定制订单逻辑 ===
      const validated = createCustomOrderSchema.parse(req.body);

      // 事务处理
      const result = await db.transaction(async (tx) => {
        // 创建订单主记录
        const [order] = await tx.insert(orders).values({
          orderNumber: `ORD${Date.now()}${nanoid(6)}`.toUpperCase(),
          userId,
          type: 'custom', // V2: orderType -> type
          status: 'pending', // 初始状态为待支付
          serviceStartTime: new Date(validated.serviceStartTime), // Use new field
          serviceAddress: validated.serviceAddress,
          serviceLat: validated.serviceLat.toString(),
          serviceLng: validated.serviceLng.toString(),
          // serviceHours: 0, // Removed
          duration: validated.duration, // Use validated duration
          amount: 15000, // 固定订金 150.00 -> 15000 (分)
          content: JSON.stringify({ // V2: Store requirements in content JSON
            destination: validated.city,
            startDate: validated.serviceStartTime.split('T')[0],
            endDate: validated.serviceStartTime.split('T')[0],
            peopleCount: 1,
            budget: validated.budget.toString(),
            specialRequirements: validated.content
          }),
          requirements: validated.requirements, // Additional remarks
          createdAt: new Date(),
        }).$returningId();

        // Removed customRequirements insert

        return order;
      });

      res.status(201).json({
        code: 0,
        message: '订单创建成功',
        data: {
          orderId: result.id,
          amount: 150.00, // Response in Yuan for frontend compat? Or 15000? Let's keep 150.00 for now or change frontend.
          // Assuming frontend expects Yuan, we might need to divide. But for Type check, just ensuring DB insert is correct.
        },
      });

    } else {
      // === 普通订单逻辑 ===
      const validated = createNormalOrderSchema.parse(req.body);

      // 校验地陪有效性
      const guide = await db.query.guides.findFirst({
        where: eq(guides.userId, validated.guideId) // V2: guides.id -> guides.userId
      });

      if (!guide) {
        throw new ValidationError('地陪不存在');
      }

      if (guide.userId === userId) {
        throw new ValidationError('不能预订自己的服务');
      }

      // 计算金额
      if (!guide.realPrice) { // V2: hourlyPrice -> realPrice
        throw new ValidationError('该地陪未设置价格，无法预订');
      }
      
      const price = guide.realPrice; // Already int (fen)
      const amount = price * validated.duration; // int * int = int

      // 创建订单
      const [order] = await db.insert(orders).values({
        orderNumber: `ORD${Date.now()}${nanoid(6)}`.toUpperCase(),
        userId,
        guideId: validated.guideId,
        type: 'standard', // V2: orderType -> type
        status: 'pending',
        serviceStartTime: new Date(validated.serviceStartTime),
        duration: validated.duration,
        serviceAddress: validated.serviceAddress,
        serviceLat: validated.serviceLat.toString(),
        serviceLng: validated.serviceLng.toString(),
        amount: amount, // int
        requirements: validated.requirements, // Now using requirements instead of remark
        createdAt: new Date(),
      }).$returningId();

      res.status(201).json({
        code: 0,
        message: '订单创建成功',
        data: {
          orderId: order.id,
          amount: amount / 100, // Return Yuan for frontend
        },
      });
    }

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      // 捕获 Zod 错误并转换为 ValidationError，确保消息正确传递
      const msg = (error as any).errors?.[0]?.message || '参数校验失败';
      return next(new ValidationError(msg));
    }
    next(error);
  }
}

/**
 * 支付订单 (模拟)
 */
export async function payOrder(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const orderId = parseInt(req.params.id);
  
  try {
    // 1. 验证输入
    const validated = payOrderSchema.parse(req.body);

    // 2. 查找订单
    const [order] = await db.select().from(orders).where(
      and(
        eq(orders.id, orderId),
        eq(orders.userId, userId)
      )
    );

    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new ValidationError('订单状态不正确，无法支付');
    }

    // 3. 模拟支付成功
    await db.transaction(async (tx) => {
      // 3.1 创建支付流水
      await tx.insert(payments).values({
        relatedType: 'order',
        relatedId: orderId,
        paymentMethod: 'wechat',
        transactionId: `MOCK_${nanoid()}`,
        amount: order.amount,
        status: 'success',
        paidAt: new Date(),
      });

      // 3.2 更新订单状态
      await tx.update(orders)
        .set({ status: 'paid' }) // 支付后变为 paid (待接单)
        .where(eq(orders.id, orderId));
    });

    res.json({
      code: 0,
      message: '支付成功',
      data: {
        orderId,
        status: 'paid',
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      // 捕获 Zod 错误并转换为 ValidationError，确保消息正确传递
      const msg = (error as any).errors?.[0]?.message || '参数校验失败';
      return next(new ValidationError(msg));
    }
    next(error);
  }
}

/**
 * 获取订单列表
 */
export async function getOrders(req: Request, res: Response) {
  const userId = req.user!.id;
  const { status } = req.query;

  try {
    const conditions = [eq(orders.userId, userId)];
    
    // 如果有状态筛选
    if (status && typeof status === 'string' && status !== 'all') {
      // @ts-ignore
      conditions.push(eq(orders.status, status));
    }

    const result = await db.select().from(orders)
      .where(and(...conditions))
      .orderBy(orders.createdAt); // 按创建时间倒序（这里假设schema里没写desc，后续确认）
      
    // 补充：为了前端展示方便，可能需要关联一些信息，比如customRequirements
    // 简单起见，先返回主表数据，前端根据 orderType 判断展示逻辑
    // 或者我们这里做一个简单的聚合查询
    
    // 既然是 MVP，我们先直接返回订单列表，前端在详情页再查详细信息
    // 或者如果列表页需要展示目的地，我们需要查出来
    
    const enrichedOrders = result.map((order) => {
      let extra = {};
      if (order.type === 'custom' && order.content) {
         try {
            const contentObj = JSON.parse(order.content as string);
            extra = { 
                destination: contentObj.destination, 
                startDate: contentObj.startDate 
            }; 
         } catch (e) {
            // ignore
         }
      }
      return { ...order, ...extra };
    });

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
 * 获取订单详情
 */
export async function getOrderById(req: Request, res: Response) {
  const userId = req.user!.id;
  const orderId = parseInt(req.params.id);

  if (isNaN(orderId)) {
    throw new ValidationError('无效的订单ID');
  }

  try {
    const [order] = await db.select().from(orders).where(
      and(
        eq(orders.id, orderId),
        eq(orders.userId, userId)
      )
    );

    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    let result: any = { ...order };

    if (order.type === 'custom') { // V2: orderType -> type
        // V2: Candidates logic removed.
        // Just return order info
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: result,
    });
  } catch (error) {
    throw error;
  }
}

/**
 * 获取候选地陪列表 (Deprecated in V2)
 */
export async function getCandidates(req: Request, res: Response) {
  // V2: This API is deprecated as custom orders are directly assigned by admin/CS.
  res.json({
    code: 0,
    message: '获取成功',
    data: { list: [] }
  });
}

/**
 * 用户选择地陪 (Deprecated in V2)
 */
export async function selectGuide(req: Request, res: Response, next: NextFunction) {
  // V2: Deprecated. Custom orders are assigned by admin.
  return next(new ValidationError('该接口已废弃'));
}
