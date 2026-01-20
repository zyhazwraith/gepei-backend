import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { orders, customRequirements, payments, users, guides } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { AppError, NotFoundError, ValidationError } from '../utils/errors.js';
import { ErrorCodes } from '../../shared/errorCodes.js';

// 验证 Schema
const createCustomOrderSchema = z.object({
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
  city: z.string().min(1, '城市不能为空'),
  content: z.string().min(10, '服务内容至少10个字'),
  budget: z.number().min(0, '预算必须大于等于0'),
  requirements: z.string().optional(),
});

// 普通订单 Schema
const createNormalOrderSchema = z.object({
  guide_id: z.number().int().positive(),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
  service_hours: z.number().int().min(1, '服务时长至少1小时'),
  remark: z.string().optional(),
});

// 模拟支付 Schema
const payOrderSchema = z.object({
  payment_method: z.enum(['wechat']),
});

/**
 * 创建订单 (支持 custom 和 normal)
 */
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  console.log('createOrder body:', req.body);
  
  try {
    // 1. 判断订单类型
    const isCustom = !req.body.guide_id;

    if (isCustom) {
      // === 定制订单逻辑 ===
      const validated = createCustomOrderSchema.parse(req.body);

      // 事务处理
      const result = await db.transaction(async (tx) => {
        // 创建订单主记录
        const [order] = await tx.insert(orders).values({
          orderNumber: `ORD${Date.now()}${nanoid(6)}`.toUpperCase(),
          userId,
          orderType: 'custom',
          status: 'pending', // 初始状态为待支付
          serviceDate: validated.service_date,
          serviceHours: 0, // 定制单按天或项目计价，初始设为0
          amount: '150.00', // 固定订金
          createdAt: new Date(),
        }).$returningId();

        // 创建定制需求详情
        await tx.insert(customRequirements).values({
          orderId: order.id,
          destination: validated.city, // 映射 city 到 destination
          startDate: validated.service_date,
          endDate: validated.service_date, // 暂定一天
          peopleCount: 1, // 默认为1人，后续可添加字段
          budget: validated.budget.toString(),
          specialRequirements: validated.content + (validated.requirements ? `\n备注: ${validated.requirements}` : ''),
          createdAt: new Date(),
        });

        return order;
      });

      res.status(201).json({
        code: 0,
        message: '订单创建成功',
        data: {
          order_id: result.id,
          amount: 150.00,
        },
      });

    } else {
      // === 普通订单逻辑 (FP-018) ===
      const validated = createNormalOrderSchema.parse(req.body);

      // 校验地陪有效性
      const guide = await db.query.guides.findFirst({
        where: eq(guides.id, validated.guide_id)
      });

      if (!guide) {
        throw new ValidationError('地陪不存在');
      }

      if (guide.userId === userId) {
        throw new ValidationError('不能预订自己的服务');
      }

      // 计算金额
      if (!guide.hourlyPrice) {
        throw new ValidationError('该地陪未设置价格，无法预订');
      }
      
      const price = Number(guide.hourlyPrice);
      const amount = (price * validated.service_hours).toFixed(2);

      // 创建订单
      const [order] = await db.insert(orders).values({
        orderNumber: `ORD${Date.now()}${nanoid(6)}`.toUpperCase(),
        userId,
        guideId: validated.guide_id,
        orderType: 'normal',
        status: 'pending',
        serviceDate: validated.service_date,
        serviceHours: validated.service_hours,
        amount: amount.toString(),
        requirements: validated.remark,
        createdAt: new Date(),
      }).$returningId();

      res.status(201).json({
        code: 0,
        message: '订单创建成功',
        data: {
          order_id: order.id,
          amount: Number(amount),
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
        orderId,
        paymentMethod: validated.payment_method,
        transactionId: `TXN${Date.now()}${nanoid(6)}`.toUpperCase(),
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
        order_id: orderId,
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
    
    const enrichedOrders = await Promise.all(result.map(async (order) => {
      let extra = {};
      if (order.orderType === 'custom') {
        const [req] = await db.select().from(customRequirements).where(eq(customRequirements.orderId, order.id));
        if (req) {
          extra = { destination: req.destination, startDate: req.startDate };
        }
      }
      return { ...order, ...extra };
    }));

    // 按时间倒序排序 (内存排序，因为orderBy在orm里写起来可能有点繁琐，先这样)
    enrichedOrders.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
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

    // 如果是定制单，查询需求详情
    if (order.orderType === 'custom') {
      const [requirements] = await db.select().from(customRequirements).where(
        eq(customRequirements.orderId, orderId)
      );
      result.custom_requirements = requirements || null;
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
