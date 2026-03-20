import { getPaymentStatus, PrepayPayParams } from './api';
import { readCachedWechatAuthCode, cacheWechatAuthCode } from './wechatAuth';

type JsBridge = {
  invoke: (
    method: string,
    params: Record<string, unknown>,
    callback: (result: { err_msg?: string }) => void,
  ) => void;
};

function getBridge(): JsBridge | undefined {
  return (window as unknown as { WeixinJSBridge?: JsBridge }).WeixinJSBridge;
}

export function isDevMockAuthFallbackActive(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  const code = new URLSearchParams(window.location.search).get('code');
  return !code?.trim();
}

export function resolveAuthCodeFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get('code');
  const normalized = code?.trim();
  if (normalized) {
    cacheWechatAuthCode(normalized);
    return normalized;
  }

  const cachedCode = readCachedWechatAuthCode();
  if (cachedCode) {
    return cachedCode;
  }

  if (import.meta.env.DEV) {
    return 'mock_code';
  }

  return null;
}

export async function invokeWechatJsapiPay(payParams: PrepayPayParams): Promise<'success' | 'cancel' | 'fail' | 'skipped'> {
  const bridge = getBridge();
  if (!bridge) {
    return 'skipped';
  }

  return new Promise((resolve) => {
    bridge.invoke('getBrandWCPayRequest', payParams, (res) => {
      const errMsg = res?.err_msg?.toLowerCase() || '';
      if (errMsg.includes('ok')) {
        resolve('success');
        return;
      }
      if (errMsg.includes('cancel')) {
        resolve('cancel');
        return;
      }
      resolve('fail');
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitPaymentSuccess(
  transactionId: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<'success' | 'failed' | 'timeout'> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const intervalMs = options.intervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const statusRes = await getPaymentStatus(transactionId);
    if (statusRes.code === 0 && statusRes.data) {
      if (statusRes.data.paymentStatus === 'success') {
        return 'success';
      }
      if (statusRes.data.paymentStatus === 'failed') {
        return 'failed';
      }
    }
    await sleep(intervalMs);
  }

  return 'timeout';
}
