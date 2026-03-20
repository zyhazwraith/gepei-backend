const WECHAT_OAUTH_AUTHORIZE_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize';
const WECHAT_UA_PATTERN = /micromessenger/i;
const WECHAT_OAUTH_ATTEMPT_KEY = 'wechat_oauth_attempted_url';
const WECHAT_OAUTH_CODE_KEY = 'wechat_oauth_code';

function isWechatBrowser(): boolean {
  return WECHAT_UA_PATTERN.test(window.navigator.userAgent || '');
}

function buildCurrentUrlWithoutOauthParams(): URL {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  return url;
}

export function readCachedWechatAuthCode(): string | null {
  const code = sessionStorage.getItem(WECHAT_OAUTH_CODE_KEY)?.trim();
  return code || null;
}

export function cacheWechatAuthCode(code: string): void {
  const normalized = code.trim();
  if (!normalized) {
    return;
  }
  sessionStorage.setItem(WECHAT_OAUTH_CODE_KEY, normalized);
}

function getWechatOauthAppId(): string | null {
  const appId = import.meta.env.VITE_WECHAT_OAUTH_APP_ID?.trim();
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
  if (import.meta.env.DEV) {
    return;
  }
  if (!isWechatBrowser()) {
    return;
  }

  const currentUrl = new URL(window.location.href);
  const wechatError = readWechatOauthErrorFromUrl(currentUrl);
  if (wechatError) {
    return;
  }

  const code = currentUrl.searchParams.get('code')?.trim();
  if (code) {
    cacheWechatAuthCode(code);
    sessionStorage.removeItem(WECHAT_OAUTH_ATTEMPT_KEY);
    return;
  }

  const cachedCode = readCachedWechatAuthCode();
  if (cachedCode) {
    return;
  }

  const appId = getWechatOauthAppId();
  if (!appId) {
    return;
  }

  const cleanedUrl = buildCurrentUrlWithoutOauthParams();
  const cleanedUrlText = cleanedUrl.toString();
  if (!force && sessionStorage.getItem(WECHAT_OAUTH_ATTEMPT_KEY) === cleanedUrlText) {
    return;
  }
  void trigger;
  sessionStorage.setItem(WECHAT_OAUTH_ATTEMPT_KEY, cleanedUrlText);

  const redirectUri = encodeURIComponent(cleanedUrlText);
  const state = encodeURIComponent('gepei_pay');
  const oauthUrl = `${WECHAT_OAUTH_AUTHORIZE_URL}?appid=${encodeURIComponent(appId)}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=${state}#wechat_redirect`;
  window.location.replace(oauthUrl);
}
