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
  }
}
