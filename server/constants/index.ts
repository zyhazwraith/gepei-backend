
/**
 * 订单状态枚举
 * Matches mysqlEnum in schema.ts
 */
export enum OrderStatus {
  PENDING = 'pending',               // 待支付
  PAID = 'paid',                     // 已支付 (待接单/待指派)
  WAITING_SERVICE = 'waiting_service', // 待服务 (已指派/已接单)
  IN_SERVICE = 'in_service',         // 服务中
  SERVICE_ENDED = 'service_ended',   // 服务结束 (等待结算)
  COMPLETED = 'completed',           // 已完成 (已结算)
  CANCELLED = 'cancelled',           // 已取消
  REFUNDED = 'refunded'              // 已退款
}

/**
 * 资金流水类型枚举
 */
export enum WalletLogType {
  INCOME = 'income',
  WITHDRAW_FREEZE = 'withdraw_freeze',
  WITHDRAW_UNFREEZE = 'withdraw_unfreeze',
  WITHDRAW_SUCCESS = 'withdraw_success',
  REFUND = 'refund'
}

/**
 * 提现状态枚举
 */
export enum WithdrawStatus {
  PENDING = 'pending',     // 审核中/冻结中
  COMPLETED = 'completed', // 已打款
  REJECTED = 'rejected'    // 已驳回
}
