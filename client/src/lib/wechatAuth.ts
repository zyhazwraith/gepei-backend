import { toast } from 'sonner';

const WECHAT_OAUTH_AUTHORIZE_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize';
const WECHAT_UA_PATTERN = /micromessenger/i;
const WECHAT_OAUTH_ATTEMPT_KEY = 'wechat_oauth_attempted_url';
const WECHAT_AUTH_DEBUG_TOAST_ID = 'wechat-auth-debug';

function logAuth(message: string, extra?: unknown): void {
  if (extra === undefined) {
    toast(message, { id: WECHAT_AUTH_DEBUG_TOAST_ID, duration: 5000 });
    return;
  }
  const text = typeof extra === 'string' ? extra : JSON.stringify(extra);
  toast(`${message}: ${text}`, { id: WECHAT_AUTH_DEBUG_TOAST_ID, duration: 7000 });
}

function isWechatBrowser(): boolean {
  return WECHAT_UA_PATTERN.test(window.navigator.userAgent || '');
}

function buildCurrentUrlWithoutOauthParams(): URL {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  return url;
}

function getWechatOauthAppId(): string | null {
  const appId = import.meta.env.WECHAT_OAUTH_APP_ID?.trim();
  return appId || null;
}

function readWechatOauthErrorFromUrl(url: URL): string | null {
  const error = url.searchParams.get('error')?.trim();
  const errorDescription = url.searchParams.get('error_description')?.trim();
  const errcode = url.searchParams.get('errcode')?.trim();
  const errmsg = url.searchParams.get('errmsg')?.trim();

  if (error || errorDescription || errcode || errmsg) {
    return JSON.stringify({
      error: error || undefined,
      error_description: errorDescription || undefined,
      errcode: errcode || undefined,
      errmsg: errmsg || undefined,
    });
  }
  return null;
}

export function ensureWechatAuthCode(options: { force?: boolean; trigger?: 'app_init' | 'pay_click' } = {}): void {
  const force = options.force === true;
  const trigger = options.trigger ?? 'app_init';
  logAuth('ensureWechatAuthCode start', {
    href: window.location.href,
    dev: import.meta.env.DEV,
    force,
    trigger,
  });
  if (import.meta.env.DEV) {
    logAuth('skip oauth redirect in DEV mode');
    return;
  }
  if (!isWechatBrowser()) {
    logAuth('skip oauth redirect because userAgent is not WeChat');
    return;
  }

  const currentUrl = new URL(window.location.href);
  const wechatError = readWechatOauthErrorFromUrl(currentUrl);
  if (wechatError) {
    logAuth('wechat oauth error from URL', wechatError);
    return;
  }

  const code = currentUrl.searchParams.get('code')?.trim();
  if (code) {
    logAuth('found code in URL', code);
    sessionStorage.removeItem(WECHAT_OAUTH_ATTEMPT_KEY);
    return;
  }
  logAuth('code missing in URL');

  const appId = getWechatOauthAppId();
  if (!appId) {
    logAuth('missing WECHAT_OAUTH_APP_ID, skip oauth redirect');
    return;
  }

  const cleanedUrl = buildCurrentUrlWithoutOauthParams();
  const cleanedUrlText = cleanedUrl.toString();
  if (!force && sessionStorage.getItem(WECHAT_OAUTH_ATTEMPT_KEY) === cleanedUrlText) {
    logAuth('oauth redirect already attempted for this URL, skip loop');
    return;
  }
  if (force) {
    logAuth('force oauth retry triggered');
  }
  sessionStorage.setItem(WECHAT_OAUTH_ATTEMPT_KEY, cleanedUrlText);

  const redirectUri = encodeURIComponent(cleanedUrlText);
  const state = encodeURIComponent('gepei_pay');
  const oauthUrl = `${WECHAT_OAUTH_AUTHORIZE_URL}?appid=${encodeURIComponent(appId)}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${state}#wechat_redirect`;

  logAuth('redirecting to WeChat OAuth URL', oauthUrl);
  window.location.replace(oauthUrl);
}
