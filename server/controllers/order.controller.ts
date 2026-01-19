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

// 模拟支付 Schema
const payOrderSchema = z.object({
  payment_method: z.enum(['wechat']),
});

/**
 * 创建定制订单
 */
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  const userId = req.user!.id;
  
  try {
    const validated = createCustomOrderSchema.parse(req.body);

    // 2. 事务处理
    const result = await db.transaction(async (tx) => {
      // 2.1 创建订单主记录
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

      // 2.2 创建定制需求详情
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      // 捕获 Zod 错误并转换为 ValidationError，确保消息正确传递
      // 调试发现：msg 变成了 "参数校验失败"
      // 原因：JSON.stringify 显示 error 对象只有 name 和 message 属性
      // 而 errors 属性为 undefined，说明在 catch 到的 error 对象中 errors 属性可能不可枚举或者丢失了
      // 但 ZodError 应该有 errors 属性。
      
      // 让我们尝试解析 error.message，因为 ZodError 的 message 实际上是一个 JSON 字符串，包含了错误详情
      let msg = '参数校验失败';
      try {
          const parsed = JSON.parse(error.message);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
              msg = parsed[0].message;
          }
      } catch (e) {
          // 如果解析失败，尝试直接访问 errors 属性（作为备选）
          if (error.errors?.[0]?.message) {
              msg = error.errors[0].message;
          }
      }
      
      // 尝试打印错误信息
      // console.log('ZodError captured in controller:', msg);
      
      return res.status(400).json({
        code: ErrorCodes.VALIDATION_ERROR,
        message: msg,
        data: null
      });
    } else {
        // console.log('Other error in controller:', error.name, error.message);
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
      const msg = error.errors?.[0]?.message || '参数校验失败';
      
      // 注意：AppError 构造函数可能存在问题，或者继承链在 Vitest 环境下表现不一致
      // 导致 message 属性没有被正确设置或被覆盖。
      // 我们这里显式创建一个对象来模拟 AppError 的结构，或者直接返回 JSON
      
      // 最终方案：直接在 Controller 层返回 400 响应，完全绕过 errorHandler 的不确定性
      // 这虽然不是最佳实践，但在当前环境下是最可靠的修复方式
      return res.status(400).json({
        code: ErrorCodes.VALIDATION_ERROR,
        message: msg,
        data: null
      });
    }
    next(error);
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
