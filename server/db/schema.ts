
// 4. 支付记录表
export const payments = mysqlTable('payments', {
  id: serial('id').primaryKey(),
  orderId: int('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  paymentMethod: mysqlEnum('payment_method', ['wechat']).default('wechat'),
  transactionId: varchar('transaction_id', { length: 64 }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['pending', 'success', 'failed']).default('pending'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => {
  return {
    idxOrderId: index('idx_order_id').on(table.orderId),
    idxTransactionId: index('idx_transaction_id').on(table.transactionId),
    idxStatus: index('idx_status').on(table.status),
  };
});

// 5. 提现记录表
export const withdrawals = mysqlTable('withdrawals', {
  id: serial('id').primaryKey(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['pending', 'processing', 'completed', 'failed']).default('pending'),
  bankInfo: json('bank_info'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => {
  return {
    idxUserId: index('idx_user_id').on(table.userId),
    idxStatus: index('idx_status').on(table.status),
  };
});

// 6. 私人定制需求表
export const customRequirements = mysqlTable('custom_requirements', {
  id: serial('id').primaryKey(),
  orderId: int('order_id').notNull().unique().references(() => orders.id, { onDelete: 'cascade' }),
  destination: varchar('destination', { length: 100 }).notNull(),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }).notNull(),
  peopleCount: int('people_count').notNull(),
  budget: decimal('budget', { precision: 10, scale: 2 }),
  specialRequirements: text('special_requirements'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => {
  return {
    idxOrderId: index('idx_order_id').on(table.orderId),
  };
});

// 7. 定制订单候选地陪表
export const customOrderCandidates = mysqlTable('custom_order_candidates', {
  id: serial('id').primaryKey(),
  orderId: int('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  guideId: int('guide_id').notNull().references(() => guides.id, { onDelete: 'cascade' }),
  isSelected: boolean('is_selected').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    idxOrderId: index('idx_order_id').on(table.orderId),
    idxGuideId: index('idx_guide_id').on(table.guideId),
    uniqueOrderGuide: unique('unique_order_guide').on(table.orderId, table.guideId),
  };
});

// 8. 评价表
export const reviews = mysqlTable('reviews', {
  id: serial('id').primaryKey(),
  orderId: int('order_id').notNull().unique().references(() => orders.id, { onDelete: 'cascade' }),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  guideId: int('guide_id').notNull().references(() => guides.id, { onDelete: 'cascade' }),
  rating: int('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, (table) => {
  return {
    idxOrderId: index('idx_order_id').on(table.orderId),
    idxGuideId: index('idx_guide_id').on(table.guideId),
  };
});

// 9. 管理员操作日志表
export const adminLogs = mysqlTable('admin_logs', {
  id: serial('id').primaryKey(),
  adminId: int('admin_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  targetType: varchar('target_type', { length: 50 }),
  targetId: int('target_id'),
  details: json('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    idxAdminId: index('idx_admin_id').on(table.adminId),
    idxAction: index('idx_action').on(table.action),
    idxCreatedAt: index('idx_created_at').on(table.createdAt),
  };
});
