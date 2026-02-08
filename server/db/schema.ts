import {
  mysqlTable,
  serial,
  varchar,
  int,
  boolean,
  timestamp,
  decimal,
  json,
  text,
  date,
  mysqlEnum,
  index,
  unique,
} from 'drizzle-orm/mysql-core';

// --------------------------------------------------------------------------
// 1. 系统与支撑表 (System & Support)
// --------------------------------------------------------------------------

// 1.1 附件表 (Attachments) [V2 新增]
export const attachments = mysqlTable('attachments', {
  id: int('id').primaryKey().autoincrement(),
  uploaderId: int('uploader_id').notNull(), // FK handled logically or circular ref issue
  key: varchar('key', { length: 255 }).unique(), // V2: Unique key for overwrite strategy
  url: varchar('url', { length: 500 }).notNull(),
  storageType: mysqlEnum('storage_type', ['local', 'oss']).default('local'),
  fileType: varchar('file_type', { length: 50 }), // MIME type
  usageType: varchar('usage_type', { length: 50 }), // avatar, check_in, id_card
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(), // V2: Track updates
}, (table) => {
  return {
    idxUploader: index('idx_uploader_id').on(table.uploaderId),
    idxKey: unique('idx_key').on(table.key),
  };
});

// 1.2 系统配置表 (System Configs) [V2 新增]
export const systemConfigs = mysqlTable('system_configs', {
  key: varchar('key', { length: 50 }).primaryKey(),
  value: text('value'),
  description: varchar('description', { length: 100 }),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// --------------------------------------------------------------------------
// 2. 核心用户与地陪 (Users & Guides)
// --------------------------------------------------------------------------

// 2.1 用户表 (Users) [V2 修改]
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  phone: varchar('phone', { length: 11 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 50 }),
  isGuide: boolean('is_guide').default(false),
  role: mysqlEnum('role', ['user', 'admin', 'cs']).notNull().default('user'),
  balance: int('balance').default(0), // 单位: 分
  status: mysqlEnum('status', ['active', 'banned']).default('active'),
  banReason: varchar('ban_reason', { length: 255 }),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => {
  return {
    idxPhone: index('idx_phone').on(table.phone),
    idxIsGuide: index('idx_is_guide').on(table.isGuide),
    idxDeletedAt: index('idx_deleted_at').on(table.deletedAt),
  };
});

// 2.2 地陪表 (Guides) [V2 重构]
export const guides = mysqlTable('guides', {
  userId: int('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  stageName: varchar('stage_name', { length: 50 }).notNull(), // V2: Renamed from name to stageName
  avatarId: int('avatar_id'), // V2: Moved from users
  idNumber: varchar('id_number', { length: 18 }).notNull().unique(),
  city: varchar('city', { length: 50 }).notNull(),
  address: varchar('address', { length: 255 }),
  intro: text('intro'),
  expectedPrice: int('expected_price'), // 单位: 分
  realPrice: int('real_price'), // 单位: 分
  tags: json('tags'),
  photoIds: json('photo_ids'), // Array of attachment IDs
  latitude: decimal('latitude', { precision: 10, scale: 6 }),
  longitude: decimal('longitude', { precision: 10, scale: 6 }),
  idVerifiedAt: timestamp('id_verified_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => {
  return {
    idxCity: index('idx_city').on(table.city),
    idxDeletedAt: index('idx_deleted_at').on(table.deletedAt),
  };
});

// --------------------------------------------------------------------------
// 3. 订单与交易 (Orders & Transactions)
// --------------------------------------------------------------------------

// 3.1 订单表 (Orders) [V2 重构]
export const orders = mysqlTable('orders', {
  id: int('id').primaryKey().autoincrement(),
  orderNumber: varchar('order_number', { length: 32 }).notNull().unique(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  guideId: int('guide_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // 指向 users 表 (V2: 必填)
  creatorId: int('creator_id').references(() => users.id, { onDelete: 'set null' }),
  type: mysqlEnum('type', ['standard', 'custom']).notNull().default('standard'),
  status: mysqlEnum('status', [
    'pending',
    'paid',
    'waiting_service',
    'in_service',
    'service_ended',
    'completed',
    'cancelled',
    'refunded'
  ]).default('pending'),
  
  // 核心服务信息
  pricePerHour: int('price_per_hour'), // 单位: 分 (单价快照)
  duration: int('duration'), // 预约时长 (小时)
  totalDuration: int('total_duration'), // V2: 实际总时长 (预约 + 加时)
  amount: int('amount').notNull(), // 原始订单金额 (单位: 分)
  totalAmount: int('total_amount').default(0), // 订单总流水 (原始 + 加时)
  guideIncome: int('guide_income').default(0), // 地陪总收入
  refundAmount: int('refund_amount').default(0), // 已退款金额 (单位: 分)
  content: text('content'), // 核心服务内容 (纯文本描述，如“三日包车游”)
  requirements: text('requirements'), // 备注/特殊要求
  
  // 时间信息
  serviceStartTime: timestamp('service_start_time'),
  serviceEndTime: timestamp('service_end_time'), // 预计服务结束时间
  paidAt: timestamp('paid_at'),
  actualEndTime: timestamp('actual_end_time'),
  
  // LBS 快照 (可选保留，视业务需要)
  serviceAddress: varchar('service_address', { length: 255 }),
  serviceLat: decimal('service_lat', { precision: 10, scale: 6 }),
  serviceLng: decimal('service_lng', { precision: 10, scale: 6 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => {
  return {
    idxOrderNumber: index('idx_order_number').on(table.orderNumber),
    idxUserId: index('idx_user_id').on(table.userId),
    idxGuideId: index('idx_guide_id').on(table.guideId),
    idxStatus: index('idx_status').on(table.status),
    idxType: index('idx_type').on(table.type),
    idxDeletedAt: index('idx_deleted_at').on(table.deletedAt),
  };
});

// 3.2 加时记录表 (Overtime Records) [V2 新增]
export const overtimeRecords = mysqlTable('overtime_records', {
  id: int('id').primaryKey().autoincrement(),
  orderId: int('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  duration: int('duration').notNull(), // 计费时长 (小时)
  fee: int('fee').notNull(), // 单位: 分
  status: mysqlEnum('status', ['pending', 'paid']).default('pending'),
  startTime: timestamp('start_time'), // 物理开始时间
  endTime: timestamp('end_time'), // 物理结束时间
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    idxOrderId: index('idx_order_id').on(table.orderId),
  };
});

// 3.3 支付记录表 (Payments) [V2 修改]
export const payments = mysqlTable('payments', {
  id: int('id').primaryKey().autoincrement(),
  amount: int('amount').notNull(), // 单位: 分
  transactionId: varchar('transaction_id', { length: 64 }),
  paymentMethod: mysqlEnum('payment_method', ['wechat']).default('wechat'),
  status: mysqlEnum('status', ['pending', 'success', 'failed']).default('pending'),
  relatedType: mysqlEnum('related_type', ['order', 'overtime']).notNull(),
  relatedId: int('related_id').notNull(), // OrderID or OvertimeID
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => {
  return {
    idxTransactionId: index('idx_transaction_id').on(table.transactionId),
    idxRelated: index('idx_related').on(table.relatedType, table.relatedId),
  };
});

// --------------------------------------------------------------------------
// 4. 资金与审计 (Finance & Audit)
// --------------------------------------------------------------------------

// 4.1 审计日志表 (Audit Logs) [V2 重构]
export const auditLogs = mysqlTable('audit_logs', {
  id: int('id').primaryKey().autoincrement(),
  operatorId: int('operator_id').notNull().references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(), // guide_audit, withdraw_audit, refund...
  targetType: varchar('target_type', { length: 50 }),
  targetId: int('target_id'),
  details: json('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    idxOperator: index('idx_operator_id').on(table.operatorId),
    idxAction: index('idx_action').on(table.action),
  };
});

// 4.2 资金流水表 (Wallet Logs) [V2 新增]
export const walletLogs = mysqlTable('wallet_logs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: mysqlEnum('type', [
    'income', 
    'withdraw_freeze', 
    'withdraw_unfreeze', 
    'withdraw_success', 
    'refund'
  ]).notNull(),
  amount: int('amount').notNull(), // 单位: 分, +/-
  relatedType: varchar('related_type', { length: 50 }), // order, withdrawal
  relatedId: int('related_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    idxUser: index('idx_user_id').on(table.userId),
    idxType: index('idx_type').on(table.type),
  };
});

// 4.3 提现申请表 (Withdrawals) [V2 修改]
export const withdrawals = mysqlTable('withdrawals', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: int('amount').notNull(), // 单位: 分
  status: mysqlEnum('status', ['pending', 'completed', 'rejected']).default('pending'),
  userNote: varchar('user_note', { length: 255 }), // 用户收款信息
  adminNote: varchar('admin_note', { length: 255 }), // 管理员备注/驳回理由
  bankInfo: json('bank_info'), // Deprecated but kept for compatibility if needed
  auditLogId: int('audit_log_id'), // FK -> audit_logs.id
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => {
  return {
    idxUser: index('idx_user_id').on(table.userId),
    idxStatus: index('idx_status').on(table.status),
  };
});

// 4.4 退款记录表 (Refund Records) [V2 新增]
export const refundRecords = mysqlTable('refund_records', {
  id: int('id').primaryKey().autoincrement(),
  orderId: int('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amount: int('amount').notNull(), // 单位: 分
  reason: varchar('reason', { length: 255 }),
  operatorId: int('operator_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    idxOrder: index('idx_order_id').on(table.orderId),
  };
});

// --------------------------------------------------------------------------
// 5. 其他业务表 (Others)
// --------------------------------------------------------------------------

// 5.1 评价表 (Reviews) [V1 保留]
export const reviews = mysqlTable('reviews', {
  id: int('id').primaryKey().autoincrement(),
  orderId: int('order_id').notNull().unique().references(() => orders.id, { onDelete: 'cascade' }),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  guideId: int('guide_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // Point to user_id
  rating: int('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => {
  return {
    idxOrder: index('idx_order_id').on(table.orderId),
    idxGuide: index('idx_guide_id').on(table.guideId),
  };
});

// 5.2 打卡记录表 (Check In Records) [V2 新增]
export const checkInRecords = mysqlTable('check_in_records', {
  id: int('id').primaryKey().autoincrement(),
  orderId: int('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  type: mysqlEnum('type', ['start', 'end']).notNull(),
  time: timestamp('time').defaultNow(),
  latitude: decimal('latitude', { precision: 10, scale: 6 }),
  longitude: decimal('longitude', { precision: 10, scale: 6 }),
  attachmentId: int('attachment_id'), // FK -> attachments.id (Photo)
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    idxOrder: index('idx_order_id').on(table.orderId),
  };
});

// --------------------------------------------------------------------------
// Deprecated Tables (Kept for migration reference if needed, but commented out)
// --------------------------------------------------------------------------
// export const customRequirements = ...
// export const customOrderCandidates = ...
