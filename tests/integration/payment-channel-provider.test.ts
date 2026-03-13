import axios from 'axios';
import { createCipheriv, createSign, generateKeyPairSync } from 'crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createPaymentChannelProvider,
  resetMockPaymentOrderResults,
  setMockPaymentOrderResult,
} from '../../server/services/payment/payment-channel.provider.js';

const ENV_KEYS = [
  'PAYMENT_PROVIDER',
  'WECHAT_NOTIFY_URL',
  'WECHAT_PAY_APP_ID',
  'WECHAT_PAY_MCH_ID',
  'WECHAT_PAY_MCH_SERIAL_NO',
  'WECHAT_PAY_PRIVATE_KEY_PATH',
  'WECHAT_PAY_PLATFORM_SERIAL_NO',
  'WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH',
  'WECHAT_PAY_API_V3_KEY',
  'WECHAT_PAY_BASE_URL',
] as const;

const ORIGINAL_ENV = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Record<string, string | undefined>;
const tempDirs: string[] = [];

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const original = ORIGINAL_ENV[key];
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
}

function createWechatEnv() {
  const merchant = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const platform = generateKeyPairSync('rsa', { modulusLength: 2048 });

  const dir = mkdtempSync(join(tmpdir(), 'gepei-wechat-pay-'));
  tempDirs.push(dir);

  const merchantPrivateKey = merchant.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const platformPrivateKey = platform.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const platformPublicKey = platform.publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const merchantKeyPath = join(dir, 'merchant_private.pem');
  const platformPubPath = join(dir, 'platform_public.pem');
  writeFileSync(merchantKeyPath, merchantPrivateKey, 'utf8');
  writeFileSync(platformPubPath, platformPublicKey, 'utf8');

  process.env.PAYMENT_PROVIDER = 'wechat';
  process.env.WECHAT_NOTIFY_URL = 'https://example.com/api/v1/payments/wechat/notify';
  process.env.WECHAT_PAY_APP_ID = 'wx_phase3_test';
  process.env.WECHAT_PAY_MCH_ID = '1900000109';
  process.env.WECHAT_PAY_MCH_SERIAL_NO = 'merchant_serial_001';
  process.env.WECHAT_PAY_PRIVATE_KEY_PATH = merchantKeyPath;
  process.env.WECHAT_PAY_PLATFORM_SERIAL_NO = 'platform_serial_001';
  process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH = platformPubPath;
  process.env.WECHAT_PAY_API_V3_KEY = '12345678901234567890123456789012';
  process.env.WECHAT_PAY_BASE_URL = 'https://api.mch.weixin.qq.com';

  return { platformPrivateKey };
}

afterEach(() => {
  resetMockPaymentOrderResults();
  vi.restoreAllMocks();
  restoreEnv();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('payment channel provider', () => {
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

  it('mock provider parseNotify maps SUCCESS to success (raw json text)', async () => {
    process.env.PAYMENT_PROVIDER = 'mock';
    const provider = createPaymentChannelProvider();

    const result = await provider.parseNotify({
      headers: {},
      rawBody: JSON.stringify({
        out_trade_no: 'WX_ORD_2_123_xxx',
        status: 'SUCCESS',
      }),
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

  it('throws on invalid provider', () => {
    process.env.PAYMENT_PROVIDER = 'invalid';
    expect(() => createPaymentChannelProvider()).toThrow('Invalid PAYMENT_PROVIDER');
  });

  it('wechat provider createPrepay maps upstream prepay_id to jsapi params', async () => {
    createWechatEnv();
    const requestSpy = vi.spyOn(axios, 'request').mockResolvedValueOnce({
      data: { prepay_id: 'wx201410272009395522657a690389285100' },
    } as never);

    const provider = createPaymentChannelProvider();
    const result = await provider.createPrepay({
      transactionId: 'WX_ORD_9_123_xxx',
      amountFen: 18800,
      openid: 'oUpF8uMuAJO_M2pxb1Q9zNjWeS6o',
      appId: 'wx_phase3_test',
      description: 'order#9',
      clientIp: '127.0.0.1',
    });

    expect(result.payParams.appId).toBe('wx_phase3_test');
    expect(result.payParams.package).toContain('prepay_id=');
    expect(result.payParams.paySign.length).toBeGreaterThan(0);

    const req = requestSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(req.url).toBe('/v3/pay/transactions/jsapi');
    expect((req.headers as Record<string, string>).Authorization.startsWith('WECHATPAY2-SHA256-RSA2048')).toBe(true);
  });

  it('wechat provider queryOrder maps SUCCESS to success', async () => {
    createWechatEnv();
    vi.spyOn(axios, 'request').mockResolvedValueOnce({
      data: {
        out_trade_no: 'WX_ORD_10_123_xxx',
        transaction_id: '4200001922202401011234567890',
        trade_state: 'SUCCESS',
        success_time: '2026-01-01T10:00:00+08:00',
        amount: { total: 5200 },
      },
    } as never);

    const provider = createPaymentChannelProvider();
    const result = await provider.queryOrder('WX_ORD_10_123_xxx');
    expect(result.status).toBe('success');
    expect(result.amountFen).toBe(5200);
    expect(result.upstreamTransactionId).toBe('4200001922202401011234567890');
  });

  it('wechat provider parseNotify verifies signature and decrypts payload', async () => {
    const { platformPrivateKey } = createWechatEnv();
    const provider = createPaymentChannelProvider();

    const notifyPayload = {
      out_trade_no: 'WX_ORD_11_123_xxx',
      transaction_id: '4200001922202401010987654321',
      trade_state: 'SUCCESS',
      success_time: '2026-01-02T10:00:00+08:00',
      amount: { total: 10100 },
    };

    const resourceNonce = '0123456789ab';
    const associatedData = 'transaction';
    const cipher = createCipheriv(
      'aes-256-gcm',
      Buffer.from(process.env.WECHAT_PAY_API_V3_KEY!, 'utf8'),
      Buffer.from(resourceNonce, 'utf8'),
    );
    cipher.setAAD(Buffer.from(associatedData, 'utf8'));
    const encryptedBody = Buffer.concat([
      cipher.update(JSON.stringify(notifyPayload), 'utf8'),
      cipher.final(),
    ]);
    const encrypted = Buffer.concat([encryptedBody, cipher.getAuthTag()]).toString('base64');

    const envelope = {
      id: 'EV-000001',
      create_time: '2026-01-02T10:00:01+08:00',
      event_type: 'TRANSACTION.SUCCESS',
      resource_type: 'encrypt-resource',
      summary: '支付成功',
      resource: {
        algorithm: 'AEAD_AES_256_GCM',
        ciphertext: encrypted,
        associated_data: associatedData,
        nonce: resourceNonce,
        original_type: 'transaction',
      },
    };
    const rawBody = JSON.stringify(envelope);

    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const headerNonce = 'nonce-123456';
    const message = `${timestamp}\n${headerNonce}\n${rawBody}\n`;
    const signer = createSign('RSA-SHA256');
    signer.update(message);
    signer.end();
    const signature = signer.sign(platformPrivateKey, 'base64');

    const result = await provider.parseNotify({
      headers: {
        'wechatpay-timestamp': timestamp,
        'wechatpay-nonce': headerNonce,
        'wechatpay-signature': signature,
        'wechatpay-serial': process.env.WECHAT_PAY_PLATFORM_SERIAL_NO!,
      },
      rawBody,
    });

    expect(result.transactionId).toBe('WX_ORD_11_123_xxx');
    expect(result.status).toBe('success');
    expect(result.amountFen).toBe(10100);
    expect(result.upstreamTransactionId).toBe('4200001922202401010987654321');
  });
});
