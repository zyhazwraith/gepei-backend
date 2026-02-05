/**
 * 错误码定义
 * 符合API设计文档 V1.2
 */

export const ErrorCodes = {
  // 成功
  SUCCESS: 0,
  
  // 认证相关错误 (1001-1010)
  PHONE_EXISTS: 1001,           // 手机号已注册
  INVALID_CREDENTIALS: 1002,    // 手机号或密码错误
  USER_NOT_FOUND: 1003,         // 用户不存在
  TOKEN_INVALID: 1004,          // Token过期或无效
  PERMISSION_DENIED: 1005,      // 权限不足
  INVALID_ID_NUMBER: 1006,      // 身份证号格式错误
  ORDER_NOT_FOUND: 1007,        // 订单不存在
  INVALID_ORDER_STATUS: 1008,   // 订单状态不允许该操作
  INSUFFICIENT_BALANCE: 1009,   // 余额不足
  INVALID_PARAMS: 1010,         // 参数错误
  USER_BANNED: 1011,            // 用户已被封禁
  VALIDATION_ERROR: 2002,       // 字段验证错误
  
  // 服务器错误 (2001+)
  INTERNAL_ERROR: 2001,         // 服务器内部错误
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * 错误码到HTTP状态码的映射
 */
export const ErrorCodeToHttpStatus: Record<number, number> = {
  [ErrorCodes.SUCCESS]: 200,
  [ErrorCodes.PHONE_EXISTS]: 400,
  [ErrorCodes.INVALID_CREDENTIALS]: 401,
  [ErrorCodes.USER_NOT_FOUND]: 404,
  [ErrorCodes.TOKEN_INVALID]: 401,
  [ErrorCodes.PERMISSION_DENIED]: 403,
  [ErrorCodes.INVALID_ID_NUMBER]: 400,
  [ErrorCodes.ORDER_NOT_FOUND]: 404,
  [ErrorCodes.INVALID_ORDER_STATUS]: 400,
  [ErrorCodes.INSUFFICIENT_BALANCE]: 400,
  [ErrorCodes.INVALID_PARAMS]: 400,
  [ErrorCodes.USER_BANNED]: 403,
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.INTERNAL_ERROR]: 500,
};

/**
 * 错误码到错误消息的映射
 */
export const ErrorCodeToMessage: Record<number, string> = {
  [ErrorCodes.SUCCESS]: 'success',
  [ErrorCodes.PHONE_EXISTS]: '手机号已注册',
  [ErrorCodes.INVALID_CREDENTIALS]: '手机号或密码错误',
  [ErrorCodes.USER_NOT_FOUND]: '用户不存在',
  [ErrorCodes.TOKEN_INVALID]: 'Token过期或无效',
  [ErrorCodes.PERMISSION_DENIED]: '权限不足',
  [ErrorCodes.INVALID_ID_NUMBER]: '身份证号格式错误',
  [ErrorCodes.ORDER_NOT_FOUND]: '订单不存在',
  [ErrorCodes.INVALID_ORDER_STATUS]: '订单状态不允许该操作',
  [ErrorCodes.INSUFFICIENT_BALANCE]: '余额不足',
  [ErrorCodes.INVALID_PARAMS]: '参数错误',
  [ErrorCodes.USER_BANNED]: '用户已被封禁',
  [ErrorCodes.VALIDATION_ERROR]: '字段验证错误',
  [ErrorCodes.INTERNAL_ERROR]: '服务器内部错误',
};
