import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { nanoid } from 'nanoid';
import {
  PAYMENT_PROVIDER_MOCK,
  PAYMENT_PROVIDER_WECHAT,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
} from '../../constants/payment.js';
import { ErrorCodes } from '../../../shared/errorCodes.js';
import type {
  IPaymentChannelProvider,
  ProviderCreatePrepayInput,
  ProviderCreatePrepayResult,
  ProviderCreateRefundInput,
  ProviderCreateRefundResult,
  ProviderNotifyInput,
  ProviderPaymentResult,
  ProviderRefundResult,
} from './payment.types.js';
import { AppError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../lib/logger.js';
import {
  decryptWechatNotifyResource,
  getHeaderValue,
  mapWechatRefundStatus,
  mapWechatTradeState,
  parseWechatConfigOrThrow,
  signMessage,
  type WechatCreatePrepayResponse,
  type WechatCreateRefundResponse,
  type WechatNotifyEnvelope,
  type WechatNotifyPaymentPayload,
  type WechatNotifyRefundPayload,
  type WechatPayConfig,
  type WechatQueryOrderResponse,
  type WechatQueryRefundResponse,
  verifyMessage,
  WECHAT_API_BASE_URL,
} from './wechat-pay.helper.js';

type MockOrderState = ProviderPaymentResult;
type MockRefundState = ProviderRefundResult;

const mockOrderState = new Map<string, MockOrderState>();
const mockRefundState = new Map<string, MockRefundState>();
const WECHAT_PAY_JSAPI_CANONICAL_URL = '/v3/pay/transactions/jsapi';
const WECHAT_PAY_QUERY_ORDER_CANONICAL_PREFIX = '/v3/pay/transactions/out-trade-no/';
const WECHAT_REFUND_CREATE_CANONICAL_URL = '/v3/refund/domestic/refunds';
const WECHAT_REFUND_QUERY_CANONICAL_PREFIX = '/v3/refund/domestic/refunds/';

function parseRawBodyObject(rawBody: Buffer): Record<string, unknown> {
  const text = rawBody.toString('utf8').trim();

  if (!text) {
    throw new ValidationError('微信回调参数无效');
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') {
      throw new ValidationError('微信回调参数无效');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new ValidationError('微信回调参数无效');
  }
}

function extractOutTradeNo(rawBody: Buffer): string {
  const body = parseRawBodyObject(rawBody);
  const candidate = body.outTradeNo ?? body.out_trade_no;
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new ValidationError('缺少outTradeNo');
  }

  return candidate.trim();
}

function extractOutRefundNo(rawBody: Buffer): string {
  const body = parseRawBodyObject(rawBody);
  const candidate = body.outRefundNo ?? body.out_refund_no;
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new ValidationError('缺少outRefundNo');
  }

  return candidate.trim();
}

function normalizeMockStatus(status: unknown) {
  const raw = typeof status === 'string' ? status.toUpperCase() : 'PENDING';
  if (raw === 'SUCCESS' || raw === 'PAID') {
    return PAYMENT_STATUS_SUCCESS;
  }
  if (raw === 'FAILED' || raw === 'FAIL' || raw === 'CLOSED') {
    return PAYMENT_STATUS_FAILED;
  }
  return PAYMENT_STATUS_PENDING;
}

class MockPaymentChannelProvider implements IPaymentChannelProvider {
  async createPrepay(input: ProviderCreatePrepayInput): Promise<ProviderCreatePrepayResult> {
    const defaultState: MockOrderState = {
      outTradeNo: input.outTradeNo,
      status: PAYMENT_STATUS_PENDING,
      amountFen: input.amountFen,
      raw: { createdBy: 'mock.createPrepay' },
    };
    mockOrderState.set(input.outTradeNo, defaultState);

    return {
      payParams: {
        appId: input.appId,
        timeStamp: `${Math.floor(Date.now() / 1000)}`,
        nonceStr: nanoid(16),
        package: `prepay_id=mock_${input.outTradeNo}`,
        signType: 'RSA',
        paySign: nanoid(32),
      },
      raw: input,
    };
  }

  async queryOrder(outTradeNo: string): Promise<ProviderPaymentResult> {
    const state = mockOrderState.get(outTradeNo);
    if (state) {
      return state;
    }

    return {
      outTradeNo,
      status: PAYMENT_STATUS_PENDING,
    };
  }

  async parseNotify(input: ProviderNotifyInput): Promise<ProviderPaymentResult> {
    const outTradeNo = extractOutTradeNo(input.rawBody);
    const body = parseRawBodyObject(input.rawBody);
    const status = normalizeMockStatus(body.status ?? 'SUCCESS');
    const prevState = mockOrderState.get(outTradeNo);
    const amountFen = typeof body.amountFen === 'number' ? body.amountFen : prevState?.amountFen;
    const upstreamTransactionId =
      typeof body.transactionId === 'string'
        ? body.transactionId
        : (typeof body.transaction_id === 'string' ? body.transaction_id : undefined);
    const paidAt = typeof body.paidAt === 'string' ? new Date(body.paidAt) : new Date();

    const nextState: MockOrderState = {
      outTradeNo,
      status,
      amountFen,
      upstreamTransactionId,
      paidAt,
      raw: input.rawBody,
    };

    mockOrderState.set(outTradeNo, nextState);
    return nextState;
  }

  async createRefund(input: ProviderCreateRefundInput): Promise<ProviderCreateRefundResult> {
    const state: MockRefundState = {
      outRefundNo: input.outRefundNo,
      status: PAYMENT_STATUS_PENDING,
      amountFen: input.amountFen,
      raw: { createdBy: 'mock.createRefund', input },
    };
    mockRefundState.set(input.outRefundNo, state);

    return {
      outRefundNo: input.outRefundNo,
      status: PAYMENT_STATUS_PENDING,
      amountFen: input.amountFen,
      raw: input,
    };
  }

  async queryRefund(outRefundNo: string): Promise<ProviderRefundResult> {
    const state = mockRefundState.get(outRefundNo);
    if (state) {
      return state;
    }

    return {
      outRefundNo,
      status: PAYMENT_STATUS_PENDING,
    };
  }

  async parseRefundNotify(input: ProviderNotifyInput): Promise<ProviderRefundResult> {
    const outRefundNo = extractOutRefundNo(input.rawBody);
    const body = parseRawBodyObject(input.rawBody);
    const status = normalizeMockStatus(body.status ?? body.refund_status ?? 'SUCCESS');
    const amountFen = typeof body.amountFen === 'number' ? body.amountFen : undefined;
    const refundTransactionId = typeof body.refundId === 'string' ? body.refundId : undefined;
    const successAt = typeof body.successAt === 'string' ? new Date(body.successAt) : new Date();

    const nextState: MockRefundState = {
      outRefundNo,
      status,
      amountFen,
      refundTransactionId,
      successAt,
      raw: input.rawBody,
    };

    mockRefundState.set(outRefundNo, nextState);
    return nextState;
  }
}

class WechatPaymentChannelProvider implements IPaymentChannelProvider {
  constructor(private readonly config: WechatPayConfig) {}

  private buildAuthorization(method: string, canonicalUrl: string, bodyText: string): string {
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const nonceStr = randomUUID().replace(/-/g, '');
    const message = `${method}\n${canonicalUrl}\n${timestamp}\n${nonceStr}\n${bodyText}\n`;
    const signature = signMessage(this.config.privateKeyPem, message);

    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.config.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${this.config.mchSerialNo}",signature="${signature}"`;
  }

  private async requestWechat<T extends Record<string, unknown>>(
    method: 'GET' | 'POST',
    canonicalUrl: string,
    payload?: Record<string, unknown>,
  ): Promise<T> {
    const bodyText = payload ? JSON.stringify(payload) : '';

    try {
      const response = await axios.request<T>({
        method,
        baseURL: WECHAT_API_BASE_URL,
        url: canonicalUrl,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: this.buildAuthorization(method, canonicalUrl, bodyText),
          'User-Agent': 'gepei-backend-wechatpay/phase3',
        },
        data: payload,
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ code?: string; message?: string }>;
      const detail = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;
      logger.error(`wechat_payment_http_error method=${method} url=${canonicalUrl}`, detail);
      throw new AppError('微信支付服务暂时不可用，请稍后重试', ErrorCodes.WECHAT_TEMP_UNAVAILABLE, 503);
    }
  }

  async createPrepay(input: ProviderCreatePrepayInput): Promise<ProviderCreatePrepayResult> {
    if (input.appId !== this.config.appId) {
      throw new AppError('微信支付配置异常，请稍后重试', ErrorCodes.WECHAT_CONFIG_ERROR, 500);
    }

    const canonicalUrl = WECHAT_PAY_JSAPI_CANONICAL_URL;
    const payload = {
      appid: this.config.appId,
      mchid: this.config.mchId,
      description: input.description,
      out_trade_no: input.outTradeNo,
      notify_url: this.config.notifyUrl,
      amount: {
        total: input.amountFen,
        currency: 'CNY',
      },
      payer: {
        openid: input.openid,
      },
    };

    const data = await this.requestWechat<WechatCreatePrepayResponse>('POST', canonicalUrl, payload);
    if (!data.prepay_id || typeof data.prepay_id !== 'string') {
      throw new AppError('微信预支付创建失败，请稍后重试', ErrorCodes.WECHAT_UPSTREAM_ERROR, 502);
    }

    const nonceStr = randomUUID().replace(/-/g, '');
    const timeStamp = `${Math.floor(Date.now() / 1000)}`;
    const pkg = `prepay_id=${data.prepay_id}`;
    const signText = `${this.config.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
    const paySign = signMessage(this.config.privateKeyPem, signText);

    return {
      payParams: {
        appId: this.config.appId,
        timeStamp,
        nonceStr,
        package: pkg,
        signType: 'RSA',
        paySign,
      },
      raw: data,
    };
  }

  async queryOrder(outTradeNo: string): Promise<ProviderPaymentResult> {
    const canonicalUrl = `${WECHAT_PAY_QUERY_ORDER_CANONICAL_PREFIX}${encodeURIComponent(outTradeNo)}?mchid=${this.config.mchId}`;
    const data = await this.requestWechat<WechatQueryOrderResponse>('GET', canonicalUrl);

    const amountFen = typeof data.amount?.total === 'number' ? data.amount.total : undefined;
    const paidAt = typeof data.success_time === 'string' ? new Date(data.success_time) : undefined;

    return {
      outTradeNo,
      status: mapWechatTradeState(data.trade_state),
      amountFen,
      upstreamTransactionId: typeof data.transaction_id === 'string' ? data.transaction_id : undefined,
      paidAt,
      raw: data,
    };
  }

  async parseNotify(input: ProviderNotifyInput): Promise<ProviderPaymentResult> {
    const rawBodyText = input.rawBody.toString('utf8');
    const timestamp = getHeaderValue(input.headers, 'wechatpay-timestamp');
    const nonce = getHeaderValue(input.headers, 'wechatpay-nonce');
    const signature = getHeaderValue(input.headers, 'wechatpay-signature');
    const serial = getHeaderValue(input.headers, 'wechatpay-serial');

    if (!timestamp || !nonce || !signature || !serial) {
      throw new ValidationError('微信回调签名头缺失');
    }

    if (serial !== this.config.platformSerialNo) {
      throw new ValidationError('微信平台证书序列号不匹配');
    }

    const verifyText = `${timestamp}\n${nonce}\n${rawBodyText}\n`;
    const verified = verifyMessage(this.config.platformPublicKeyPem, verifyText, signature);
    if (!verified) {
      throw new ValidationError('微信回调验签失败');
    }

    let envelope: WechatNotifyEnvelope;
    try {
      envelope = JSON.parse(rawBodyText) as WechatNotifyEnvelope;
    } catch {
      throw new ValidationError('微信回调参数无效');
    }

    const resource = envelope.resource;
    if (!resource) {
      throw new ValidationError('微信回调密文结构无效');
    }

    let decrypted: string;
    try {
      decrypted = decryptWechatNotifyResource(resource, this.config.apiV3Key);
    } catch {
      throw new ValidationError('微信回调解密失败');
    }

    let notifyPayload: WechatNotifyPaymentPayload;
    try {
      notifyPayload = JSON.parse(decrypted) as WechatNotifyPaymentPayload;
    } catch {
      throw new ValidationError('微信回调解密内容无效');
    }

    if (!notifyPayload.out_trade_no || typeof notifyPayload.out_trade_no !== 'string') {
      throw new ValidationError('微信回调缺少outTradeNo');
    }

    return {
      outTradeNo: notifyPayload.out_trade_no,
      status: mapWechatTradeState(notifyPayload.trade_state),
      amountFen: typeof notifyPayload.amount?.total === 'number' ? notifyPayload.amount.total : undefined,
      upstreamTransactionId: typeof notifyPayload.transaction_id === 'string' ? notifyPayload.transaction_id : undefined,
      paidAt: typeof notifyPayload.success_time === 'string' ? new Date(notifyPayload.success_time) : undefined,
      raw: {
        envelope,
        payload: notifyPayload,
      },
    };
  }

  async createRefund(input: ProviderCreateRefundInput): Promise<ProviderCreateRefundResult> {
    const upstreamTransactionId = input.upstreamTransactionId?.trim();
    const outTradeNo = input.outTradeNo?.trim();
    const hasUpstreamTransactionId = typeof upstreamTransactionId === 'string' && /^\d{1,32}$/.test(upstreamTransactionId);
    const hasOutTradeNo = typeof outTradeNo === 'string' && outTradeNo.length > 0;

    if (!hasUpstreamTransactionId && !hasOutTradeNo) {
      throw new ValidationError('缺少有效退款单关联标识');
    }

    const payload = {
      out_refund_no: input.outRefundNo,
      reason: input.reason,
      notify_url: input.notifyUrl || this.config.refundNotifyUrl,
      amount: {
        refund: input.amountFen,
        total: input.totalAmountFen,
        currency: 'CNY',
      },
      ...(hasUpstreamTransactionId
        ? { transaction_id: upstreamTransactionId }
        : { out_trade_no: outTradeNo! }),
    };

    const data = await this.requestWechat<WechatCreateRefundResponse>('POST', WECHAT_REFUND_CREATE_CANONICAL_URL, payload);

    return {
      outRefundNo: input.outRefundNo,
      status: mapWechatRefundStatus(data.status),
      amountFen: input.amountFen,
      refundTransactionId: typeof data.refund_id === 'string' ? data.refund_id : undefined,
      raw: data,
    };
  }

  async queryRefund(outRefundNo: string): Promise<ProviderRefundResult> {
    const canonicalUrl = `${WECHAT_REFUND_QUERY_CANONICAL_PREFIX}${encodeURIComponent(outRefundNo)}`;
    const data = await this.requestWechat<WechatQueryRefundResponse>('GET', canonicalUrl);

    return {
      outRefundNo,
      status: mapWechatRefundStatus(data.status),
      amountFen: typeof data.amount?.refund === 'number' ? data.amount.refund : undefined,
      refundTransactionId: typeof data.refund_id === 'string' ? data.refund_id : undefined,
      successAt: typeof data.success_time === 'string' ? new Date(data.success_time) : undefined,
      raw: data,
    };
  }

  async parseRefundNotify(input: ProviderNotifyInput): Promise<ProviderRefundResult> {
    const rawBodyText = input.rawBody.toString('utf8');
    const timestamp = getHeaderValue(input.headers, 'wechatpay-timestamp');
    const nonce = getHeaderValue(input.headers, 'wechatpay-nonce');
    const signature = getHeaderValue(input.headers, 'wechatpay-signature');
    const serial = getHeaderValue(input.headers, 'wechatpay-serial');

    if (!timestamp || !nonce || !signature || !serial) {
      throw new ValidationError('微信回调签名头缺失');
    }

    if (serial !== this.config.platformSerialNo) {
      throw new ValidationError('微信平台证书序列号不匹配');
    }

    const verifyText = `${timestamp}\n${nonce}\n${rawBodyText}\n`;
    const verified = verifyMessage(this.config.platformPublicKeyPem, verifyText, signature);
    if (!verified) {
      throw new ValidationError('微信回调验签失败');
    }

    let envelope: WechatNotifyEnvelope;
    try {
      envelope = JSON.parse(rawBodyText) as WechatNotifyEnvelope;
    } catch {
      throw new ValidationError('微信回调参数无效');
    }

    const resource = envelope.resource;
    if (!resource) {
      throw new ValidationError('微信回调密文结构无效');
    }

    let decrypted: string;
    try {
      decrypted = decryptWechatNotifyResource(resource, this.config.apiV3Key);
    } catch {
      throw new ValidationError('微信回调解密失败');
    }

    let notifyPayload: WechatNotifyRefundPayload;
    try {
      notifyPayload = JSON.parse(decrypted) as WechatNotifyRefundPayload;
    } catch {
      throw new ValidationError('微信回调解密内容无效');
    }

    if (!notifyPayload.out_refund_no || typeof notifyPayload.out_refund_no !== 'string') {
      throw new ValidationError('微信回调缺少outRefundNo');
    }

    return {
      outRefundNo: notifyPayload.out_refund_no,
      status: mapWechatRefundStatus(notifyPayload.refund_status),
      amountFen: typeof notifyPayload.amount?.refund === 'number' ? notifyPayload.amount.refund : undefined,
      refundTransactionId: typeof notifyPayload.refund_id === 'string' ? notifyPayload.refund_id : undefined,
      successAt: typeof notifyPayload.success_time === 'string' ? new Date(notifyPayload.success_time) : undefined,
      raw: {
        envelope,
        payload: notifyPayload,
      },
    };
  }
}

export function createPaymentChannelProvider(): IPaymentChannelProvider {
  const provider = (process.env.PAYMENT_PROVIDER || PAYMENT_PROVIDER_MOCK).trim().toLowerCase();

  if (provider === PAYMENT_PROVIDER_MOCK) {
    return new MockPaymentChannelProvider();
  }

  if (provider === PAYMENT_PROVIDER_WECHAT) {
    return new WechatPaymentChannelProvider(parseWechatConfigOrThrow());
  }

  throw new Error(`[payment] Invalid PAYMENT_PROVIDER: "${provider}"`);
}

export function setMockPaymentOrderResult(input: {
  outTradeNo: string;
  status: 'pending' | 'success' | 'failed';
  amountFen?: number;
  upstreamTransactionId?: string;
  paidAt?: Date;
}): void {
  const state: MockOrderState = {
    outTradeNo: input.outTradeNo,
    status: input.status,
    amountFen: input.amountFen,
    upstreamTransactionId: input.upstreamTransactionId,
    paidAt: input.paidAt,
    raw: { setBy: 'mock.helper' },
  };
  mockOrderState.set(input.outTradeNo, state);
}

export function resetMockPaymentOrderResults(): void {
  mockOrderState.clear();
  mockRefundState.clear();
}
