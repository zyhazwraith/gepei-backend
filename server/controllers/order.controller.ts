import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { orders, users, guides, overtimeRecords } from '../db/schema.js';
import { eq, and, ne, or, count, desc, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { GUIDE_INCOME_RATIO } from '../shared/constants.js';
import { PaymentService } from '../services/payment/payment.service.js';
import { PAYMENT_METHOD_WECHAT } from '../constants/payment.js';

// 验证 Schema
const createCustomOrderSchema = z.object({
  // Common fields
  serviceStartTime: z.string().datetime({ message: '无效的时间格式 (ISO 8601)' }),
  serviceAddress: z.string().min(1, '服务地点不能为空'),
  serviceLat: z.number().min(-90).max(90),
  serviceLng: z.number().min(-180).max(180),
  duration: z.number().int().min(1).default(8), // Add duration with default 8
  
  // Custom specific fields
  content: z.string().min(1, '服务内容不能为空'),
  price: z.number().int().min(1, '单价必须大于0'), // Changed from budget to price (unit: cents)
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
  content: z.string().optional(), // Add content field
});

// 支付请求 Schema（authCode 可选：优先用本次code，否则复用服务端会话中的openid）
const payRequestSchema = z.object({
  paymentMethod: z.enum([PAYMENT_METHOD_WECHAT]),
  authCode: z.string().trim().min(1, 'authCode不能为空').optional(),
});

// 加时申请 Schema
const createOvertimeSchema = z.object({
  duration: z.number().int().min(1).max(24),
});

/**
 * 创建订单 (支持 custom 和 normal)
 */
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  
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
      // V2: Custom orders are created by admin/cs only.
      throw new ValidationError('定制订单仅支持后台创建');
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

      const startTime = new Date(validated.serviceStartTime);
      const endTime = new Date(startTime.getTime() + validated.duration * 60 * 60 * 1000);

      // 创建订单
      const [order] = await db.insert(orders).values({
        orderNumber: `ORD${Date.now()}${nanoid(6)}`.toUpperCase(),
        userId,
        creatorId: userId, // Record creator
        guideId: validated.guideId,
        type: 'standard', // V2: orderType -> type
        status: 'pending',
        serviceStartTime: startTime,
        serviceEndTime: endTime, // Initialize serviceEndTime
        duration: validated.duration,
        totalDuration: validated.duration, // Initialize totalDuration
        serviceAddress: validated.serviceAddress,
        serviceLat: validated.serviceLat.toString(),
        serviceLng: validated.serviceLng.toString(),
        pricePerHour: price, // Store snapshot price
        amount: amount, // int
        totalAmount: amount, // Initial Total = Base Amount
        guideIncome: Math.round(amount * GUIDE_INCOME_RATIO), // Initial Income
        requirements: validated.requirements, // Now using requirements instead of remark
        content: validated.content, // Store service content
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
    const validated = payRequestSchema.parse(req.body);
    const intent = await OrderService.prepareOrderPaymentIntent(orderId, userId);

    const prepay = await PaymentService.createPrepay({
      intent,
      paymentMethod: validated.paymentMethod,
      userId,
      authCode: validated.authCode,
      clientIp: req.ip,
    });

    res.json({
      code: 0,
      message: '预支付创建成功',
      data: {
        orderId,
        transactionId: prepay.transactionId,
        paymentStatus: prepay.paymentStatus,
        payParams: prepay.payParams,
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
 * User Initiated Refund
 * POST /api/v1/orders/:id/refund
 */
export async function refundOrder(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const orderId = parseInt(req.params.id);

  if (isNaN(orderId)) {
    return next(new ValidationError('无效的订单ID'));
  }

  try {
    const result = await OrderService.refundByUser(userId, orderId);
    
    res.json({
      code: 0,
      message: '退款申请已受理',
      data: result
    });
  } catch (error) {
    if (error instanceof ValidationError && error.message === '订单已退款') {
      res.json({
        code: 0,
        message: '订单已退款',
        data: {
          success: true,
          alreadyRefunded: true,
          message: '订单已退款'
        }
      });
      return;
    }
    next(error);
  }
}

/**
 * 获取订单列表
 * Query Params:
 * - status: string (optional)
 * - viewAs: 'customer' | 'guide' (optional, default 'customer')
 * - page: number (optional, default 1)
 * - limit: number (optional, default 10)
 */
export async function getOrders(req: Request, res: Response) {
  const userId = req.user!.id;
  const { status, viewAs } = req.query; // Renamed role -> viewAs
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];

    // 角色筛选逻辑 (Refactored View Logic)
    if (viewAs === 'guide') {
        // Guide View: Show orders where I am the guide
        conditions.push(eq(orders.guideId, userId));
    } else {
        // Customer View (Default): Show orders where I am the creator/user
        // AND EXCLUDE orders where I am also the guide (to avoid self-order pollution)
        conditions.push(eq(orders.userId, userId));
        conditions.push(ne(orders.guideId, userId)); // Strict filtering
    }
    
    // 如果有状态筛选
    if (status && typeof status === 'string' && status !== 'all') {
      if (status.includes(',')) {
        const statuses = status.split(',');
        // @ts-ignore
        conditions.push(inArray(orders.status, statuses));
      } else {
        // @ts-ignore
        conditions.push(eq(orders.status, status));
      }
    }

    const whereClause = and(...conditions);

    // 1. Get Total Count
    const [totalResult] = await db.select({ value: count() }).from(orders).where(whereClause);
    const total = totalResult.value;
    const totalPages = Math.ceil(total / limit);

    // 2. Get Paginated Data
    const result = await db.select().from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt)) // 按创建时间倒序
      .limit(limit)
      .offset(offset);
      
    // 补充：为了前端展示方便，可能需要关联一些信息，比如customRequirements
    const enrichedOrders = result.map((order) => {
      // V2: Content is now plain text, no JSON parsing needed
      return order;
    });

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: enrichedOrders,
        pagination: {
          total,
          page,
          pageSize: limit,
          totalPages
        }
      }
    });
  } catch (error) {
    throw error;
  }
}

/**
 * 获取订单详情
 */
export async function getOrderById(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const role = req.user!.role;
  const orderId = parseInt(req.params.id);

  if (isNaN(orderId)) {
    return next(new ValidationError('无效的订单ID'));
  }

  try {
    const result = await OrderService.getOrderDetails(orderId);
    
    // Permission Check
    const isOwner = result.userId === userId;
    const isAssignedGuide = result.guideId === userId;
    const isAdmin = role === 'admin' || role === 'cs';

    if (!isOwner && !isAssignedGuide && !isAdmin) {
        throw new ForbiddenError('无权查看此订单');
    }

    res.json({
      code: 0,
      message: '获取成功',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

import { OrderService } from '../services/order.service.js';

// ... (existing imports)

/**
 * Create Overtime Request
 * POST /api/v1/orders/:id/overtime
 */
export async function createOvertime(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const orderId = parseInt(req.params.id);

  if (isNaN(orderId)) {
    return next(new ValidationError('无效的订单ID'));
  }

  try {
    const validated = createOvertimeSchema.parse(req.body);

    // 1. 验证订单所有权
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new NotFoundError('订单不存在');
    if (order.userId !== userId) throw new ForbiddenError('无权操作此订单');
    
    // 2. 调用服务
    const createdOvertime = await OrderService.createOvertime(orderId, validated.duration);
    
    res.status(201).json({
      code: 0,
      message: '加时申请创建成功',
      data: createdOvertime
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
        const msg = (error as any).errors?.[0]?.message || '参数校验失败';
        return next(new ValidationError(msg));
    }
    next(error);
  }
}

/**
 * Pay Overtime
 * POST /api/v1/overtime/:id/pay
 */
export async function payOvertime(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  const overtimeId = parseInt(req.params.id);

  if (isNaN(overtimeId)) {
    return next(new ValidationError('无效的加时申请ID'));
  }

  try {
    // Validate Input
    const validated = payRequestSchema.parse(req.body);
    const intent = await OrderService.prepareOvertimePaymentIntent(overtimeId, userId);

    const prepay = await PaymentService.createPrepay({
      intent,
      paymentMethod: validated.paymentMethod,
      userId,
      authCode: validated.authCode,
      clientIp: req.ip,
    });
    
    res.json({
      code: 0,
      message: '预支付创建成功',
      data: {
        overtimeId,
        transactionId: prepay.transactionId,
        paymentStatus: prepay.paymentStatus,
        payParams: prepay.payParams,
      }
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
        const msg = (error as any).errors?.[0]?.message || '参数校验失败';
        return next(new ValidationError(msg));
    }
    next(error);
  }
}

// ... (existing functions)

/**
 * Check-in (Start/End Service)
 * POST /api/v1/orders/:id/check-in
 */
export async function checkIn(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id; // This is the Guide's user ID
  const orderId = parseInt(req.params.id);

  if (isNaN(orderId)) {
    return next(new ValidationError('无效的订单ID'));
  }

  try {
    const { type, attachmentId, lat, lng } = req.body;
    
    // Basic Validation (Could be moved to Zod)
    if (!['start', 'end'].includes(type)) {
       throw new ValidationError('无效的打卡类型');
    }
    if (!attachmentId || lat === undefined || lng === undefined) {
       throw new ValidationError('参数不完整 (attachmentId, lat, lng)');
    }

    // Check Ownership/Assignment
    // Guide must be the assigned guide for this order
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new NotFoundError('订单不存在');
    if (order.guideId !== userId) throw new ForbiddenError('无权操作此订单');

    const result = await OrderService.checkIn(orderId, {
      type,
      attachmentId,
      lat,
      lng
    });

    res.json({
      code: 0,
      message: type === 'start' ? '开始服务成功' : '结束服务成功',
      data: result
    });
  } catch (error) {
    next(error);
  }
}
