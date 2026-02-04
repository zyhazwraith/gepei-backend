export const WithdrawalStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const;

export const WalletLogType = {
  INCOME: 'income',
  WITHDRAW_FREEZE: 'withdraw_freeze',
  WITHDRAW_UNFREEZE: 'withdraw_unfreeze',
  WITHDRAW_SUCCESS: 'withdraw_success',
} as const;

export type WithdrawalStatusType = typeof WithdrawalStatus[keyof typeof WithdrawalStatus];
export type WalletLogTypeType = typeof WalletLogType[keyof typeof WalletLogType];
