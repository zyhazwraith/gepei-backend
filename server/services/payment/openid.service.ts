import axios, { AxiosError } from 'axios';
import { nanoid } from 'nanoid';
import { ErrorCodes } from '../../../shared/errorCodes.js';
import { AppError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../lib/logger.js';

const WECHAT_OAUTH_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token';
const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_NETWORK_RETRY = 1;

const REAUTH_ERR_CODES = new Set([40029, 40163, 41008]);
const CONFIG_ERR_CODES = new Set([40013, 40125, 40164]);
const TEMP_ERR_CODES = new Set([-1]);

export interface OpenIdResolveResult {
  openid: string;
  appId: string;
}

export interface IOpenIdProvider {
  resolveOpenIdByCode(code: string): Promise<OpenIdResolveResult>;
}

function mapWechatErrCodeToAppError(errcode: number, errmsg?: string): AppError {
  if (REAUTH_ERR_CODES.has(errcode)) {
    return new AppError('授权已失效，请重新进入支付页面', ErrorCodes.WECHAT_REAUTH_REQUIRED, 400);
  }
  if (CONFIG_ERR_CODES.has(errcode)) {
    return new AppError('微信授权配置异常，请稍后重试', ErrorCodes.WECHAT_CONFIG_ERROR, 500);
  }
  if (TEMP_ERR_CODES.has(errcode)) {
    return new AppError('微信服务暂时不可用，请稍后重试', ErrorCodes.WECHAT_TEMP_UNAVAILABLE, 503);
  }

  logger.error(`openid_wechat_unknown_errcode errcode=${errcode} errmsg=${errmsg ?? '-'}`);
  return new AppError('微信授权失败，请稍后重试', ErrorCodes.WECHAT_UPSTREAM_ERROR, 502);
}

export class MockOpenIdProvider implements IOpenIdProvider {
  async resolveOpenIdByCode(code: string): Promise<OpenIdResolveResult> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new ValidationError('authCode不能为空');
    }

    return {
      openid: `mock_openid_${nanoid(12)}`,
      appId: process.env.WECHAT_OAUTH_APP_ID?.trim() || 'mock_appid',
    };
  }
}

type WechatOAuthResponse = {
  openid?: string;
  errcode?: number;
  errmsg?: string;
};

function isRetryableTransportError(error: AxiosError): boolean {
  const status = error.response?.status;
  return !error.response || error.code === 'ECONNABORTED' || (typeof status === 'number' && status >= 500);
}

export class WechatOpenIdProvider implements IOpenIdProvider {
  constructor(
    private readonly appId: string,
    private readonly appSecret: string,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
    private readonly maxNetworkRetry: number = DEFAULT_NETWORK_RETRY,
  ) {}

  private async requestOAuth(code: string): Promise<WechatOAuthResponse> {
    const response = await axios.get<WechatOAuthResponse>(WECHAT_OAUTH_URL, {
      params: {
        appid: this.appId,
        secret: this.appSecret,
        code,
        grant_type: 'authorization_code',
      },
      timeout: this.timeoutMs,
    });
    return response.data;
  }

  async resolveOpenIdByCode(code: string): Promise<OpenIdResolveResult> {
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      throw new ValidationError('authCode不能为空');
    }

    for (let attempt = 0; attempt <= this.maxNetworkRetry; attempt += 1) {
      try {
        const payload = await this.requestOAuth(normalizedCode);
        if (payload?.openid) {
          return {
            openid: payload.openid,
            appId: this.appId,
          };
        }

        if (typeof payload?.errcode === 'number') {
          logger.error(`openid_wechat_business_error errcode=${payload.errcode} errmsg=${payload.errmsg ?? '-'}`);
          throw mapWechatErrCodeToAppError(payload.errcode, payload.errmsg);
        }

        logger.error(`openid_wechat_invalid_payload payload=${JSON.stringify(payload ?? {})}`);
        throw new AppError('微信授权失败，请稍后重试', ErrorCodes.WECHAT_UPSTREAM_ERROR, 502);
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }

        const axiosError = error as AxiosError;
        const retryable = isRetryableTransportError(axiosError);
        const status = axiosError.response?.status;

        if (retryable && attempt < this.maxNetworkRetry) {
          logger.system(`openid_wechat_retry attempt=${attempt + 1} reason=${axiosError.code ?? status ?? 'unknown'}`);
          continue;
        }

        if (retryable) {
          logger.error(`openid_wechat_temp_unavailable reason=${axiosError.code ?? status ?? 'unknown'}`);
          throw new AppError('微信服务暂时不可用，请稍后重试', ErrorCodes.WECHAT_TEMP_UNAVAILABLE, 503);
        }

        logger.error(`openid_wechat_http_error status=${status ?? '-'} code=${axiosError.code ?? '-'}`);
        throw new AppError('微信授权失败，请稍后重试', ErrorCodes.WECHAT_UPSTREAM_ERROR, 502);
      }
    }

    throw new AppError('微信服务暂时不可用，请稍后重试', ErrorCodes.WECHAT_TEMP_UNAVAILABLE, 503);
  }
}

function createOpenIdProvider(): IOpenIdProvider {
  const provider = (process.env.OPENID_PROVIDER || 'mock').trim().toLowerCase();
  if (provider === 'mock') {
    return new MockOpenIdProvider();
  }

  if (provider !== 'wechat') {
    throw new Error(`[openid] Invalid OPENID_PROVIDER: "${provider}"`);
  }

  const appId = process.env.WECHAT_OAUTH_APP_ID?.trim();
  const appSecret = process.env.WECHAT_OAUTH_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    throw new Error('[openid] WECHAT_OAUTH_APP_ID / WECHAT_OAUTH_APP_SECRET are required when OPENID_PROVIDER=wechat');
  }

  return new WechatOpenIdProvider(appId, appSecret);
}

export const openIdProvider = createOpenIdProvider();
