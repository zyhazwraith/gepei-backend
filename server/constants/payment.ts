export const PAYMENT_RELATED_TYPE_ORDER = 'order' as const;
export const PAYMENT_RELATED_TYPE_OVERTIME = 'overtime' as const;

export const PAYMENT_STATUS_PENDING = 'pending' as const;
export const PAYMENT_STATUS_SUCCESS = 'success' as const;
export const PAYMENT_STATUS_FAILED = 'failed' as const;

export const PAYMENT_METHOD_WECHAT = 'wechat' as const;

export const PAYMENT_PROVIDER_MOCK = 'mock' as const;
export const PAYMENT_PROVIDER_WECHAT = 'wechat' as const;

export const PAYMENT_TRADE_PREFIX_ORDER = 'WX_ORD';
export const PAYMENT_TRADE_PREFIX_OVERTIME = 'WX_OT';

export const OPENID_PROVIDER_MOCK = 'mock';
export const AUTH_CODE_MOCK_FALLBACK = 'mock_code';

export const PAYMENT_NOTIFY_PATH = '/api/v1/payments/wechat/notify';
