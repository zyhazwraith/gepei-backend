import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { orders, users, guides, refundRecords } from '../db/schema.js';
import { eq, desc, count, like, or, inArray, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { z } from 'zod';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { MAX_GUIDE_SELECTION } from '../../shared/constants.js';
import { nanoid } from 'nanoid';
import { OrderStatus } from '../constants/index.js';

const createCustomOrderSchema = z.object({
  userPhone: z.string().regex(/^1[3-9]\d{9}$/, '用户手机号格式错误'),
  guidePhone: z.string().regex(/^1[3-9]\d{9}$/, '地陪手机号格式错误'),
  pricePerHour: z.number().int().positive('价格必须大于0'),
  duration: z.number().int().positive('时长必须大于0'),
  serviceStartTime: z.string().datetime({ message: '开始时间格式错误 (ISO)' }),
  serviceAddress: z.string().min(1, '服务地址不能为空'),
  content: z.string().min(1, '订单内容不能为空'),
  requirements: z.string().optional(),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['user', 'cs']),
});

// ... existing imports ...

/**
 * 后台创建定制订单 (T-2)
 * POST /api/v1/admin/custom-orders
 */
export async function createCustomOrder(req: Request, res: Response) {
  try {
    const operatorId = req.user!.id;

    const validated = createCustomOrderSchema.parse(req.body);

  // 1. Find User
    const [user] = await db.select().from(users).where(eq(users.phone, validated.userPhone));
    if (!user) {
      throw new NotFoundError(`用户 ${validated.userPhone} 不存在`);
    }

    // 2. Find Guide (User)
    const [guideUser] = await db.select().from(users).where(eq(users.phone, validated.guidePhone));
    if (!guideUser) {
      throw new NotFoundError(`地陪手机号 ${validated.guidePhone} 不存在`);
    }

    // 3. Verify Guide (Table)
    const [guideRecord] = await db.select().from(guides).where(eq(guides.userId, guideUser.id));
    if (!guideRecord) {
        throw new ValidationError(`该用户 ${validated.guidePhone} 不是认证地陪`);
    }

    // 4. Calculate Amount
    const amount = validated.pricePerHour * validated.duration;

    // 5. Create Order
    const orderNumber = `ORD${Date.now()}${nanoid(6).toUpperCase()}`;
    
    // Insert
    const [result] = await db.insert(orders).values({
      orderNumber,
      userId: user.id,
      guideId: guideUser.id,
      creatorId: operatorId, // Record who created it
      type: 'custom',
      status: 'pending', // Initial status
      amount, // Total in cents
      pricePerHour: validated.pricePerHour,
      duration: validated.duration,
      serviceAddress: validated.serviceAddress,
      serviceStartTime: new Date(validated.serviceStartTime),
      content: validated.content, 
      requirements: validated.requirements,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const orderId = result.insertId;

    // 6. Audit Log
    await AuditService.log(
        operatorId,
        AuditActions.CREATE_CUSTOM_ORDER, 
        AuditTargets.ORDER,
        orderId,
        { orderNumber, amount },
        getClientIp(req)
    );

    res.status(201).json({
      code: 0,
      message: '定制订单创建成功',
      data: {
        orderId,
        orderNumber,
        amount,
        status: 'pending',
        pricePerHour: validated.pricePerHour,
        duration: validated.duration
      }
    });

  } catch (error) {
    throw error;
  }
}

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

import { AuditService } from '../services/audit.service.js';
import { AuditActions, AuditTargets } from '../constants/audit.js';
import { getClientIp } from '../utils/request.js';

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
    // 1. Define aliases first (Must be before conditions)
    const creator = alias(users, 'creator');
    const guideUser = alias(users, 'guideUser');
    const guideProfile = alias(guides, 'guideProfile');

    // 2. Build Query Conditions
    const conditions = [];
    if (keyword) {
      conditions.push(
        or(
          like(orders.orderNumber, `%${keyword}%`),
          // User (Customer)
          like(users.phone, `%${keyword}%`),
          like(users.nickname, `%${keyword}%`),
          // Creator (CS/Admin)
          like(creator.phone, `%${keyword}%`),
          like(creator.nickname, `%${keyword}%`),
          // Guide
          like(guideProfile.stageName, `%${keyword}%`),
          like(guideUser.phone, `%${keyword}%`)
        )
      );
    }

    // Status Filter
    if (req.query.status && req.query.status !== 'all') {
       const statusParam = req.query.status as string;
       if (statusParam.includes(',')) {
          // Support multi-status filtering (e.g. "cancelled,refunded")
          conditions.push(inArray(orders.status, statusParam.split(',') as any[]));
       } else {
          // Type casting for enum compatibility
          conditions.push(eq(orders.status, statusParam as any));
       }
    }

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(creator, eq(orders.creatorId, creator.id))
      .leftJoin(guideUser, eq(orders.guideId, guideUser.id))
      .leftJoin(guideProfile, eq(orders.guideId, guideProfile.userId))
      .where(and(...conditions));

    // 2. 分页查询
    const allOrders = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      orderType: orders.type,
      status: orders.status,
      amount: orders.amount, // Base Amount
      totalAmount: orders.totalAmount, // Total Revenue (Base + Overtime)
      serviceStartTime: orders.serviceStartTime,
      serviceAddress: orders.serviceAddress,
      duration: orders.duration, // Base Duration
      totalDuration: orders.totalDuration, // Total Duration (Base + Overtime)
      createdAt: orders.createdAt,
      // User Info
      userPhone: users.phone,
      userName: users.nickname, // Unified to userName
      // Creator Info
      creatorId: creator.id,
      creatorPhone: creator.phone,
      creatorName: creator.nickname, // Unified to creatorName
      // Guide Info
      guideId: guideUser.id,
      guideName: guideProfile.stageName, // Unified to guideName (from stageName)
      guidePhone: guideUser.phone,
      content: orders.content,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .leftJoin(creator, eq(orders.creatorId, creator.id))
    .leftJoin(guideUser, eq(orders.guideId, guideUser.id))
    .leftJoin(guideProfile, eq(orders.guideId, guideProfile.userId))
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
 * 封禁用户 (Admin)
 * PUT /api/v1/admin/users/:id/ban
 */
export async function banUser(req: Request, res: Response) {
  const userId = parseInt(req.params.id);
  const { reason } = req.body;
  const operatorId = req.user!.id;

  if (!reason) {
    throw new ValidationError('封禁原因不能为空');
  }

  // 1. Check User
  const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
  if (!targetUser) {
    throw new NotFoundError('用户不存在');
  }

  // 2. RBAC: Cannot ban admin
  if (targetUser.role === 'admin') {
    throw new ForbiddenError('无法封禁管理员账号');
  }

  // 3. Execute Ban
  await db.update(users)
    .set({ 
      status: 'banned', 
      banReason: reason,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  // 4. Audit Log
  await AuditService.log(
    operatorId,
    AuditActions.BAN_USER,
    AuditTargets.USER,
    userId,
    { reason },
    getClientIp(req)
  );

  res.json({
    code: 0,
    message: '用户已封禁',
    data: { userId, status: 'banned' }
  });
}

/**
 * 解封用户 (Admin)
 * PUT /api/v1/admin/users/:id/unban
 */
export async function unbanUser(req: Request, res: Response) {
  const userId = parseInt(req.params.id);
  const operatorId = req.user!.id;

  // 1. Check User
  const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
  if (!targetUser) {
    throw new NotFoundError('用户不存在');
  }

  // 2. Execute Unban
  await db.update(users)
    .set({ 
      status: 'active', 
      banReason: null,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  // 3. Audit Log
  await AuditService.log(
    operatorId,
    AuditActions.UNBAN_USER,
    AuditTargets.USER,
    userId,
    {},
    getClientIp(req)
  );

  res.json({
    code: 0,
    message: '用户已解封',
    data: { userId, status: 'active' }
  });
}

/**
 * 更新用户角色 (Admin)
 * PUT /api/v1/admin/users/:id/role
 */
export async function updateUserRole(req: Request, res: Response) {
  const userId = parseInt(req.params.id);
  const operatorId = req.user!.id;

  // 使用 Zod 校验
  const { role } = updateUserRoleSchema.parse(req.body);

  // 1. Check User
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) {
      throw new NotFoundError('用户不存在');
    }

    // 2. Prevent changing Admin role or Self
    if (targetUser.role === 'admin') {
      throw new ForbiddenError('无法修改管理员角色');
    }

    // 3. Update Role
    await db.update(users)
      .set({ 
        role: role,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // 4. Audit Log
    await AuditService.log(
      operatorId,
      AuditActions.UPDATE_USER_ROLE,
      AuditTargets.USER,
      userId,
      { oldRole: targetUser.role, newRole: role },
      getClientIp(req)
    );

    res.json({
      code: 0,
      message: '角色更新成功',
      data: { userId, role }
    });
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
      status: users.status,
      banReason: users.banReason,
      lastLoginAt: users.lastLoginAt,
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
