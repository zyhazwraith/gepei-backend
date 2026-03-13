import { PAYMENT_PROVIDER_MOCK, PAYMENT_PROVIDER_WECHAT } from '../constants/payment.js';

function parseProviderEnv(name: string, fallback: string): string {
  return (process.env[name] || fallback).trim().toLowerCase();
}

function assertHttpsAbsoluteUrl(name: string, value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`[startup] ${name} must be a valid absolute URL`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`[startup] ${name} must use https`);
  }
}

export function assertStartupEnvOrThrow(): void {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error('[startup] JWT_SECRET is required');
  }

  const paymentProvider = parseProviderEnv('PAYMENT_PROVIDER', PAYMENT_PROVIDER_MOCK);
  if (paymentProvider !== PAYMENT_PROVIDER_MOCK && paymentProvider !== PAYMENT_PROVIDER_WECHAT) {
    throw new Error(`[startup] Invalid PAYMENT_PROVIDER: "${paymentProvider}"`);
  }

  if (paymentProvider === PAYMENT_PROVIDER_WECHAT) {
    const notifyUrl = process.env.WECHAT_NOTIFY_URL?.trim();
    if (!notifyUrl) {
      throw new Error('[startup] WECHAT_NOTIFY_URL is required when PAYMENT_PROVIDER=wechat');
    }
    assertHttpsAbsoluteUrl('WECHAT_NOTIFY_URL', notifyUrl);

    const requiredWechatPayEnv = [
      'WECHAT_PAY_APP_ID',
      'WECHAT_PAY_MCH_ID',
      'WECHAT_PAY_MCH_SERIAL_NO',
      'WECHAT_PAY_PRIVATE_KEY_PATH',
      'WECHAT_PAY_PLATFORM_SERIAL_NO',
      'WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH',
      'WECHAT_PAY_API_V3_KEY',
    ] as const;

    for (const name of requiredWechatPayEnv) {
      const raw = process.env[name]?.trim();
      if (!raw) {
        throw new Error(`[startup] ${name} is required when PAYMENT_PROVIDER=wechat`);
      }
    }

    const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY!.trim();
    if (Buffer.byteLength(apiV3Key, 'utf8') !== 32) {
      throw new Error('[startup] WECHAT_PAY_API_V3_KEY must be 32 bytes');
    }
  }

  const openIdProvider = parseProviderEnv('OPENID_PROVIDER', PAYMENT_PROVIDER_MOCK);
  if (openIdProvider !== PAYMENT_PROVIDER_MOCK && openIdProvider !== PAYMENT_PROVIDER_WECHAT) {
    throw new Error(`[startup] Invalid OPENID_PROVIDER: "${openIdProvider}"`);
  }

  if (openIdProvider === PAYMENT_PROVIDER_WECHAT) {
    const appId = process.env.WECHAT_OAUTH_APP_ID?.trim();
    const appSecret = process.env.WECHAT_OAUTH_APP_SECRET?.trim();
    if (!appId || !appSecret) {
      throw new Error('[startup] WECHAT_OAUTH_APP_ID / WECHAT_OAUTH_APP_SECRET are required when OPENID_PROVIDER=wechat');
    }
  }
}
