import { getPaymentStatus, PrepayPayParams } from './api';

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

function waitBridgeReady(timeoutMs = 2500): Promise<JsBridge | undefined> {
  const direct = getBridge();
  if (direct) {
    return Promise.resolve(direct);
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(getBridge());
    };

    const cleanup = () => {
      window.removeEventListener('WeixinJSBridgeReady', done as EventListener);
      document.removeEventListener('WeixinJSBridgeReady', done as EventListener);
      clearTimeout(timer);
    };

    const timer = window.setTimeout(done, timeoutMs);
    window.addEventListener('WeixinJSBridgeReady', done as EventListener, { once: true });
    document.addEventListener('WeixinJSBridgeReady', done as EventListener, { once: true });
  });
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
    const cleanedUrl = new URL(window.location.href);
    cleanedUrl.searchParams.delete('code');
    cleanedUrl.searchParams.delete('state');
    window.history.replaceState(null, '', `${cleanedUrl.pathname}${cleanedUrl.search}${cleanedUrl.hash}`);
    return normalized;
  }

  if (import.meta.env.DEV) {
    return 'mock_code';
  }

  return null;
}

export async function invokeWechatJsapiPay(
  payParams: PrepayPayParams,
): Promise<{ status: 'success' | 'cancel' | 'fail' | 'skipped'; errMsg?: string }> {
  const bridge = await waitBridgeReady();
  if (!bridge) {
    return { status: 'skipped' };
  }

  return new Promise((resolve) => {
    bridge.invoke('getBrandWCPayRequest', payParams, (res) => {
      const errMsg = res?.err_msg?.toLowerCase() || '';
      if (errMsg.includes('ok')) {
        resolve({ status: 'success', errMsg });
        return;
      }
      if (errMsg.includes('cancel')) {
        resolve({ status: 'cancel', errMsg });
        return;
      }
      resolve({ status: 'fail', errMsg });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitPaymentSuccess(
  outTradeNo: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<'success' | 'failed' | 'timeout'> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const intervalMs = options.intervalMs ?? 2_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const statusRes = await getPaymentStatus(outTradeNo);
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
