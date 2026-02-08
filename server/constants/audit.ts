export const AuditActions = {
  AUDIT_GUIDE: 'audit_guide',
  AUDIT_WITHDRAW: 'audit_withdraw',
  BAN_USER: 'ban_user',
  UNBAN_USER: 'unban_user',
  REFUND_ORDER: 'refund_order',
  CREATE_CUSTOM_ORDER: 'create_custom_order',
  UPDATE_CONFIG: 'update_config',
  UPDATE_USER_ROLE: 'update_user_role',
} as const;

export const AuditTargets = {
  GUIDE: 'guide',
  WITHDRAWAL: 'withdrawal',
  USER: 'user',
  ORDER: 'order',
  SYSTEM_CONFIG: 'system_config',
} as const;

export type AuditActionType = typeof AuditActions[keyof typeof AuditActions];
export type AuditTargetType = typeof AuditTargets[keyof typeof AuditTargets];
