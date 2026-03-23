export const REFUND_STATUS_PENDING = 'pending' as const;
export const REFUND_STATUS_SUCCESS = 'success' as const;
export const REFUND_STATUS_FAILED = 'failed' as const;

export type RefundStatus =
  | typeof REFUND_STATUS_PENDING
  | typeof REFUND_STATUS_SUCCESS
  | typeof REFUND_STATUS_FAILED;
