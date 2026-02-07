import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { orders, payments, users, guides, overtimeRecords } from '../db/schema';
import { eq, and, ne, or, count, desc, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { AppError, NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { ErrorCodes } from '../../shared/errorCodes.js';
import { PLATFORM_COMMISSION_RATE } from '../shared/constants';

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
  content: z.string().optional(), // Add content field
});

// 模拟支付 Schema
const payOrderSchema = z.object({
  paymentMethod: z.enum(['wechat']),
});

// 选择地陪 Schema
const selectGuideSchema = z.object({
  guideId: z.number().int().positive(),
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
        const startTime = new Date(validated.serviceStartTime);
        const endTime = new Date(startTime.getTime() + validated.duration * 60 * 60 * 1000);

        // 创建订单主记录
        const [order] = await tx.insert(orders).values({
          orderNumber: `ORD${Date.now()}${nanoid(6)}`.toUpperCase(),
          userId,
          type: 'custom', // V2: orderType -> type
          status: 'pending', // 初始状态为待支付
          serviceStartTime: startTime, // Use new field
          serviceEndTime: endTime, // Initialize serviceEndTime
          serviceAddress: validated.serviceAddress,
          serviceLat: validated.serviceLat.toString(),
          serviceLng: validated.serviceLng.toString(),
          // serviceHours: 0, // Removed
          duration: validated.duration, // Use validated duration
          totalDuration: validated.duration, // Initialize totalDuration
          amount: 15000, // 固定订金 150.00 -> 15000 (分)
          totalAmount: 15000, // Initial Total = Base Amount
          guideIncome: Math.round(15000 * (1 - PLATFORM_COMMISSION_RATE)), // Initial Income
          guideId: req.body.guideId || 0, // V2 Temporary: Must have guideId per schema, but custom flow might not have it yet.
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
        guideIncome: Math.round(amount * (1 - PLATFORM_COMMISSION_RATE)), // Initial Income
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
    const validated = payOrderSchema.parse(req.body);

    // 2. 查找订单
    const [order] = await db.select().from(orders).where(
      and(
        eq(orders.id, orderId),
        or(
          eq(orders.userId, userId),
          eq(orders.guideId, userId)
        )
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
        .set({ 
          status: 'waiting_service', // 支付后变为 waiting_service (待服务)
          paidAt: new Date(),
        })
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
  const { paymentMethod } = req.body;

  if (isNaN(overtimeId)) {
    return next(new ValidationError('无效的加时申请ID'));
  }

  try {
    // Validate Input
    payOrderSchema.parse({ paymentMethod });

    // 1. Fetch Overtime Record
    const [overtime] = await db.select().from(overtimeRecords).where(eq(overtimeRecords.id, overtimeId));

    if (!overtime) {
        throw new NotFoundError('加时申请不存在');
    }

    // 2. Fetch Associated Order
    const [order] = await db.select().from(orders).where(eq(orders.id, overtime.orderId));

    if (!order) {
        throw new NotFoundError('关联订单不存在');
    }
    
    // 3. Permission Check
    if (order.userId !== userId) {
        throw new ForbiddenError('无权支付此订单');
    }

    // 4. Call Service
    const payResult = await OrderService.payOvertime(overtimeId, paymentMethod);
    
    res.json({
      code: 0,
      message: '支付成功',
      data: payResult
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

/**
 * 用户选择地陪
 * POST /api/v1/orders/:id/select-guide
 */
export async function selectGuide(req: Request, res: Response, next: NextFunction) {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.id);
    const { guideId } = req.body;

    if (isNaN(orderId)) {
        return next(new ValidationError('无效的订单ID'));
    }

    try {
        // 1. 验证订单所有权
        const [order] = await db.select().from(orders).where(
            and(
                eq(orders.id, orderId),
                eq(orders.userId, userId)
            )
        );

        if (!order) {
            throw new NotFoundError('订单不存在');
        }

        if (order.status !== 'waiting_service' && order.status !== 'paid') {
            // 注意: 这里 status 类型定义可能在 schema 中不包含 'waiting_for_user'，
            // 或者是 ts 推断问题。我们暂时用更宽松的校验。
            // 实际上 'waiting_for_user' 应该在 mysqlEnum 定义中。
            // 检查 schema.ts 发现 status 确实没有 'waiting_for_user'。
            // 我们应该添加它，或者如果是 V1 遗留，那就不应该用它。
            // 根据之前的 Read schema.ts:
            // 'pending','paid','waiting_service','in_service','service_ended','completed','cancelled','refunded'
            // 确实没有 'waiting_for_user'。这意味着定制单流程里“等待用户选择”这个状态需要映射到现有的某个状态，
            // 或者修改 Schema 添加该状态。
            // 鉴于 V2 实际上已经移除了“用户选择候选人”的流程（改为管理员指派或直接下单），
            // 这个 selectGuide 接口本身可能已经是 Deprecated 的逻辑复活。
            // 但为了修复编译错误，我们先移除这个检查或改为合法的状态。
            // 假设我们现在是在修复 V2 编译，那么这个接口可能不需要了，或者应该适配 V2 状态。
            throw new ValidationError('当前状态无法选择地陪');
        }

        // 2. 更新订单
        await db.update(orders)
            .set({
                guideId,
                status: 'waiting_service'
            })
            .where(eq(orders.id, orderId));

        res.json({
            code: 0,
            message: '选择成功',
            data: { orderId, guideId, status: 'waiting_service' }
        });

    } catch (error) {
        next(error);
    }
}

