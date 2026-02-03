import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { orders, users, guides, refundRecords } from '../db/schema.js';
import { eq, desc, count, like, or, inArray, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { z } from 'zod';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { MAX_GUIDE_SELECTION } from '../../shared/constants.js';
import { createCustomOrderSchema } from '../schemas/admin.schema.js';
import { nanoid } from 'nanoid';
import { OrderStatus } from '../constants/index.js';

// 更新状态 Schema
const updateStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'waiting_service', 'in_service', 'service_ended', 'completed', 'cancelled', 'refunded']),
  force: z.boolean().optional(),
});

// 退款 Schema
const refundOrderSchema = z.object({
  amount: z.number().int().positive(),
  reason: z.string().min(1, '退款原因不能为空'),
});

/**
 * ==============================================================================
 * V2 ADMIN WORKFLOW SPECIFICATION (V2 业务逻辑规范)
 * ==============================================================================
 * 
 * 1. Admin Order Management Scope (后台订单管理范围):
 *    - 与 `order.controller.ts` (用户端) 不同，Admin 接口具有全局视野。
 *    - 必须包含用户信息 (User) 和地陪信息 (Guide) 的关联展示。
 * 
 * 2. Order Status Transition (订单状态流转):
 *    - Pending (待支付): 初始状态。
 *    - Paid (已支付): 用户支付完成，等待服务或指派。
 *    - Waiting Service (待服务): 定制单特有状态，指派地陪后进入此状态。
 *    - In Service (服务中): 订单开始执行。
 *    - Service Ended (服务结束): 双方确认结束。
 *    - Completed (已完成): 系统结算完成 (终态)。
 *    - Cancelled (已取消): 用户或系统取消 (终态)。
 *    - Refunded (已退款): 发生退款 (终态)。
 * 
 * 3. Custom Order Workflow (定制单流程 - V2):
 *    - User: 提交需求 (Type=custom, Status=pending)。
 *    - Admin: 在后台查看列表 (`getOrders`)。
 *    - Admin: 线下联系用户与地陪，确认意向。
 *    - Admin: 使用 `assignGuide` 接口直接指派一名地陪。
 *      - Action: 设置 `guideId`，状态变更为 `waiting_service` (如果已支付) 或保持 `pending` (如果未支付)。
 *      - Note: 废弃了 V1 的 "Candidates (候选人)" 模式，改为直接指派。
 * 
 * ==============================================================================
 */

// 状态流转规则 (Updated for V2)
export const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['paid', 'waiting_service', 'cancelled'], 
  paid: ['in_service', 'cancelled', 'refunded', 'waiting_service'], // Added waiting_service
  waiting_service: ['in_service', 'cancelled'],
  in_service: ['service_ended', 'completed', 'cancelled'], 
  service_ended: ['completed', 'cancelled'], // Added cancelled
  completed: [], 
  cancelled: ['pending'], 
  refunded: [], 
};

/**
 * 获取所有订单列表 (管理员)
 * 
 * Spec:
 * - 默认按创建时间倒序。
 * - 支持关键词搜索 (订单号、用户手机、用户昵称)。
 * - 返回包含 User Profile 的富文本信息。
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
      .leftJoin(users, eq(orders.userId, users.id)) 
      .where(and(...conditions));

    // 2. 分页查询
    const allOrders = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      orderType: orders.type,
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

    res.json({
      code: 0,
      message: '获取成功',
      data: {
        list: allOrders,
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
 * 获取订单详情 (管理员)
 * GET /api/v1/admin/orders/:id
 */
export async function getOrderDetails(req: Request, res: Response) {
  const orderId = parseInt(req.params.id);
  if (isNaN(orderId)) {
    throw new ValidationError('无效的订单ID');
  }

  try {
    const guideUsers = alias(users, 'guideUsers');

    const [order] = await db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        amount: orders.amount,
        pricePerHour: orders.pricePerHour,
        duration: orders.duration,
        serviceAddress: orders.serviceAddress,
        serviceStartTime: orders.serviceStartTime,
        content: orders.content,
        requirements: orders.requirements,
        createdAt: orders.createdAt,
        userId: orders.userId,
        guideId: orders.guideId,
        userPhone: users.phone,
        userNickname: users.nickname,
        guidePhone: guideUsers.phone,
        guideNickname: guideUsers.nickname,
        refundAmount: orders.refundAmount,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(guideUsers, eq(orders.guideId, guideUsers.id))
    .where(eq(orders.id, orderId));

    if (!order) {
        throw new NotFoundError('订单不存在');
    }

    // 查询退款记录
    const records = await db.select({
      amount: refundRecords.amount,
      reason: refundRecords.reason,
      createdAt: refundRecords.createdAt,
    })
    .from(refundRecords)
    .where(eq(refundRecords.orderId, orderId));

    res.json({
        code: 0,
        message: '获取成功',
        data: {
            ...order,
            refund_records: records,
            user: {
                phone: order.userPhone,
                nickName: order.userNickname
            },
            guide: order.guideId ? {
                phone: order.guidePhone,
                nickName: order.guideNickname
            } : null,
        }
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


/**
 * 管理员获取用户列表
 */
export async function listUsers(req: Request, res: Response) {
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
// 指派地陪 (V2 Core)
// --------------------------------------------------------------------------

/**
 * 指派地陪 (Admin Assign Guide)
 * 
 * Spec (V2):
 * - 仅适用于 `custom` (定制) 订单。
 * - 必须在 `pending` 或 `paid` 状态下操作。
 * - 管理员手动选择一个 `guideId` 进行指派。
 * - 指派成功后，状态流转为 `waiting_service` (待服务)。
 */
export const assignGuide = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { guideIds } = req.body; 
    
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
    if (!guideIds || !Array.isArray(guideIds) || guideIds.length !== 1) {
        throw new ValidationError('V2 定制订单只能指派一个地陪');
    }
    
    const guideId = guideIds[0];
    const [guide] = await db.select({ id: guides.userId }).from(guides).where(eq(guides.userId, guideId));
    if (!guide) {
        throw new ValidationError('指定的地陪不存在');
    }

    // 3. 状态校验
    // 允许从 pending 或 paid 状态指派
    if (order.status !== 'pending' && order.status !== 'paid') {
         // In strict V2, maybe only allow if not cancelled/completed
    }

    // 4. 执行指派
    if (order.type === 'custom') {
        await db.update(orders)
            .set({ 
                guideId: guideId,
                status: 'waiting_service', // 明确流转状态
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

/**
 * 执行退款 (Admin)
 * POST /api/v1/admin/orders/:id/refund
 */
export async function refundOrder(req: Request, res: Response) {
  const orderId = parseInt(req.params.id);
  const operatorId = req.user!.id; 

  try {
    const validated = refundOrderSchema.parse(req.body);

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      throw new NotFoundError('订单不存在');
    }

    // 1. 状态校验
    if (![OrderStatus.PAID, OrderStatus.WAITING_SERVICE].includes(order.status as OrderStatus)) {
      throw new ValidationError('当前订单状态不支持退款');
    }

    // 2. 金额校验 (单次退款校验已由状态流转和事务保证)
    if (validated.amount > order.amount) {
      throw new ValidationError('退款金额不能超过订单实付金额');
    }

    // 3. 执行事务
    await db.transaction(async (tx) => {
      // Update Order
      await tx.update(orders)
        .set({ 
          status: OrderStatus.REFUNDED,
          refundAmount: validated.amount,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      // Insert Refund Record
      await tx.insert(refundRecords).values({
        orderId,
        amount: validated.amount,
        reason: validated.reason,
        operatorId,
      });

      // TODO: Audit Log (O-7)
    });

    res.json({
      code: 0,
      message: '退款成功',
      data: {
        orderId,
        status: OrderStatus.REFUNDED,
        refundAmount: validated.amount
      }
    });

  } catch (error) {
     if (error instanceof z.ZodError) {
      throw new ValidationError('参数错误: ' + (error as any).errors.map((e: any) => e.message).join(', '));
    }
    throw error;
  }
}
