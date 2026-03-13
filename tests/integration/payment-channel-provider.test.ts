import { afterEach, describe, expect, it } from 'vitest';
import {
  createPaymentChannelProvider,
  resetMockPaymentOrderResults,
  setMockPaymentOrderResult,
} from '../../server/services/payment/payment-channel.provider.js';

const OLD_PROVIDER = process.env.PAYMENT_PROVIDER;

afterEach(() => {
  resetMockPaymentOrderResults();
  if (OLD_PROVIDER === undefined) {
    delete process.env.PAYMENT_PROVIDER;
  } else {
    process.env.PAYMENT_PROVIDER = OLD_PROVIDER;
  }

});

describe('payment channel provider skeleton', () => {
  it('uses mock provider by default', async () => {
    delete process.env.PAYMENT_PROVIDER;
    const provider = createPaymentChannelProvider();

    const prepay = await provider.createPrepay({
      transactionId: 'WX_ORD_1_123_xxx',
      amountFen: 100,
      openid: 'openid_xxx',
      appId: 'app_xxx',
      description: 'order#1',
    });

    expect(prepay.payParams.signType).toBe('RSA');
    expect(prepay.payParams.package.startsWith('prepay_id=mock_')).toBe(true);
  });

  it('mock provider parseNotify maps SUCCESS to success', async () => {
    process.env.PAYMENT_PROVIDER = 'mock';
    const provider = createPaymentChannelProvider();

    const result = await provider.parseNotify({
      headers: {},
      rawBody: {
        out_trade_no: 'WX_ORD_2_123_xxx',
        status: 'SUCCESS',
      },
    });

    expect(result.transactionId).toBe('WX_ORD_2_123_xxx');
    expect(result.status).toBe('success');
  });

  it('mock provider queryOrder returns injected result', async () => {
    process.env.PAYMENT_PROVIDER = 'mock';
    const provider = createPaymentChannelProvider();

    setMockPaymentOrderResult({
      transactionId: 'WX_ORD_3_123_xxx',
      status: 'success',
      amountFen: 888,
      upstreamTransactionId: 'MOCK_TX_3',
    });

    const result = await provider.queryOrder('WX_ORD_3_123_xxx');
    expect(result.status).toBe('success');
    expect(result.amountFen).toBe(888);
    expect(result.upstreamTransactionId).toBe('MOCK_TX_3');
  });

  it('parseNotify should update internal mock state for subsequent query', async () => {
    process.env.PAYMENT_PROVIDER = 'mock';
    const provider = createPaymentChannelProvider();

    await provider.parseNotify({
      headers: {},
      rawBody: {
        out_trade_no: 'WX_ORD_4_123_xxx',
        status: 'SUCCESS',
        amountFen: 321,
        transactionId: 'MOCK_TX_4',
      },
    });

    const queried = await provider.queryOrder('WX_ORD_4_123_xxx');
    expect(queried.status).toBe('success');
    expect(queried.amountFen).toBe(321);
    expect(queried.upstreamTransactionId).toBe('MOCK_TX_4');
  });

  it('throws on invalid provider', () => {
    process.env.PAYMENT_PROVIDER = 'invalid';
    expect(() => createPaymentChannelProvider()).toThrow('Invalid PAYMENT_PROVIDER');
  });

  it('wechat provider createPrepay should remain not implemented in phase1', async () => {
    process.env.PAYMENT_PROVIDER = 'wechat';
    const provider = createPaymentChannelProvider();

    await expect(
      provider.createPrepay({
        transactionId: 'WX_ORD_5_123_xxx',
        amountFen: 100,
        openid: 'openid_xxx',
        appId: 'app_xxx',
        description: 'order#5',
      }),
    ).rejects.toThrow('Wechat provider not implemented in phase1');
  });
});
