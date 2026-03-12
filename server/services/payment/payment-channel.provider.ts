import { nanoid } from 'nanoid';
import {
  PAYMENT_PROVIDER_MOCK,
  PAYMENT_PROVIDER_WECHAT,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
} from '../../constants/payment.js';
import type {
  IPaymentChannelProvider,
  ProviderCreatePrepayInput,
  ProviderCreatePrepayResult,
  ProviderNotifyInput,
  ProviderOrderResult,
} from './payment.types.js';
import { ValidationError } from '../../utils/errors.js';

type MockOrderState = ProviderOrderResult;

const mockOrderState = new Map<string, MockOrderState>();

function extractTradeNo(rawBody: unknown): string {
  if (!rawBody || typeof rawBody !== 'object') {
    throw new ValidationError('微信回调参数无效');
  }

  const body = rawBody as Record<string, unknown>;
  const candidate = body.outTradeNo ?? body.out_trade_no;
  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new ValidationError('缺少outTradeNo');
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

  async queryOrder(outTradeNo: string): Promise<ProviderOrderResult> {
    const state = mockOrderState.get(outTradeNo);
    if (state) {
      return state;
    }

    return {
      outTradeNo,
      status: PAYMENT_STATUS_PENDING,
    };
  }

  async parseNotify(input: ProviderNotifyInput): Promise<ProviderOrderResult> {
    const outTradeNo = extractTradeNo(input.rawBody);

    const body = input.rawBody as Record<string, unknown>;
    const status = normalizeMockStatus(body.status ?? 'SUCCESS');
    const amountFen = typeof body.amountFen === 'number' ? body.amountFen : undefined;
    const transactionId = typeof body.transactionId === 'string' ? body.transactionId : undefined;
    const paidAt = typeof body.paidAt === 'string' ? new Date(body.paidAt) : new Date();

    const nextState: MockOrderState = {
      outTradeNo,
      status,
      amountFen,
      transactionId,
      paidAt,
      raw: input.rawBody,
    };

    mockOrderState.set(outTradeNo, nextState);
    return nextState;
  }
}

class WechatPaymentChannelProvider implements IPaymentChannelProvider {
  async createPrepay(_input: ProviderCreatePrepayInput): Promise<ProviderCreatePrepayResult> {
    throw new Error('[payment] Wechat provider not implemented in phase1');
  }

  async queryOrder(_outTradeNo: string): Promise<ProviderOrderResult> {
    throw new Error('[payment] Wechat provider not implemented in phase1');
  }

  async parseNotify(_input: ProviderNotifyInput): Promise<ProviderOrderResult> {
    throw new Error('[payment] Wechat provider not implemented in phase1');
  }
}

export function createPaymentChannelProvider(): IPaymentChannelProvider {
  const provider = (process.env.PAYMENT_PROVIDER || PAYMENT_PROVIDER_MOCK).trim().toLowerCase();

  if (provider === PAYMENT_PROVIDER_MOCK) {
    return new MockPaymentChannelProvider();
  }

  if (provider === PAYMENT_PROVIDER_WECHAT) {
    return new WechatPaymentChannelProvider();
  }

  throw new Error(`[payment] Invalid PAYMENT_PROVIDER: \"${provider}\"`);
}

export function setMockPaymentOrderResult(input: {
  outTradeNo: string;
  status: 'pending' | 'success' | 'failed';
  amountFen?: number;
  transactionId?: string;
  paidAt?: Date;
}): void {
  const state: MockOrderState = {
    outTradeNo: input.outTradeNo,
    status: input.status,
    amountFen: input.amountFen,
    transactionId: input.transactionId,
    paidAt: input.paidAt,
    raw: { setBy: 'mock.api' },
  };
  mockOrderState.set(input.outTradeNo, state);
}

export function resetMockPaymentOrderResults(): void {
  mockOrderState.clear();
}
