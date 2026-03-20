import { createDecipheriv, createSign, createVerify } from 'crypto';
import { readFileSync } from 'fs';
import {
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
} from '../../constants/payment.js';
import type { ProviderPaymentResult } from './payment.types.js';

const WECHAT_API_BASE_URL = 'https://api.mch.weixin.qq.com';

export type WechatPayConfig = {
  appId: string;
  mchId: string;
  mchSerialNo: string;
  notifyUrl: string;
  refundNotifyUrl: string;
  privateKeyPem: string;
  platformPublicKeyPem: string;
  platformSerialNo: string;
  apiV3Key: string;
};

export type WechatCreatePrepayResponse = {
  prepay_id?: string;
  [key: string]: unknown;
};

export type WechatQueryOrderResponse = {
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  success_time?: string;
  amount?: {
    total?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type WechatNotifyEnvelope = {
  id?: string;
  create_time?: string;
  event_type?: string;
  resource_type?: string;
  summary?: string;
  resource?: {
    algorithm?: string;
    ciphertext?: string;
    associated_data?: string;
    nonce?: string;
    original_type?: string;
  };
};

export type WechatNotifyPaymentPayload = {
  out_trade_no?: string;
  transaction_id?: string;
  trade_state?: string;
  success_time?: string;
  amount?: {
    total?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type WechatCreateRefundResponse = {
  refund_id?: string;
  out_refund_no?: string;
  status?: string;
  [key: string]: unknown;
};

export type WechatQueryRefundResponse = {
  refund_id?: string;
  out_refund_no?: string;
  status?: string;
  success_time?: string;
  amount?: {
    refund?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type WechatNotifyRefundPayload = {
  out_refund_no?: string;
  refund_id?: string;
  refund_status?: string;
  success_time?: string;
  amount?: {
    refund?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type WechatNotifyResource = NonNullable<WechatNotifyEnvelope['resource']>;

function readRequiredEnv(name: string): string {
  const raw = process.env[name]?.trim();
  if (!raw) {
    throw new Error(`[payment] ${name} is required when PAYMENT_PROVIDER=wechat`);
  }
  return raw;
}

function readPemFile(pathEnv: string): string {
  const filePath = readRequiredEnv(pathEnv);
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`[payment] failed to read ${pathEnv}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function parseWechatConfigOrThrow(): WechatPayConfig {
  const apiV3Key = readRequiredEnv('WECHAT_PAY_API_V3_KEY');
  if (Buffer.byteLength(apiV3Key, 'utf8') !== 32) {
    throw new Error('[payment] WECHAT_PAY_API_V3_KEY must be 32 bytes');
  }

  const notifyUrl = readRequiredEnv('WECHAT_NOTIFY_URL');
  const refundNotifyUrl = process.env.WECHAT_REFUND_NOTIFY_URL?.trim() || notifyUrl;

  return {
    appId: readRequiredEnv('WECHAT_PAY_APP_ID'),
    mchId: readRequiredEnv('WECHAT_PAY_MCH_ID'),
    mchSerialNo: readRequiredEnv('WECHAT_PAY_MCH_SERIAL_NO'),
    notifyUrl,
    refundNotifyUrl,
    privateKeyPem: readPemFile('WECHAT_PAY_PRIVATE_KEY_PATH'),
    platformPublicKeyPem: readPemFile('WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH'),
    platformSerialNo: readRequiredEnv('WECHAT_PAY_PLATFORM_SERIAL_NO'),
    apiV3Key,
  };
}

export { WECHAT_API_BASE_URL };

export function signMessage(privateKeyPem: string, message: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

export function verifyMessage(publicKeyPem: string, message: string, signature: string): boolean {
  const verifier = createVerify('RSA-SHA256');
  verifier.update(message);
  verifier.end();
  return verifier.verify(publicKeyPem, signature, 'base64');
}

export function mapWechatTradeState(tradeState: string | undefined): ProviderPaymentResult['status'] {
  const normalized = (tradeState || '').toUpperCase();
  if (normalized === 'SUCCESS') {
    return PAYMENT_STATUS_SUCCESS;
  }

  if (normalized === 'NOTPAY' || normalized === 'USERPAYING') {
    return PAYMENT_STATUS_PENDING;
  }

  if (normalized === 'CLOSED' || normalized === 'PAYERROR' || normalized === 'REVOKED') {
    return PAYMENT_STATUS_FAILED;
  }

  return PAYMENT_STATUS_PENDING;
}

export function mapWechatRefundStatus(status: string | undefined): ProviderPaymentResult['status'] {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'SUCCESS') {
    return PAYMENT_STATUS_SUCCESS;
  }

  if (normalized === 'ABNORMAL' || normalized === 'CLOSED') {
    return PAYMENT_STATUS_FAILED;
  }

  if (normalized === 'PROCESSING') {
    return PAYMENT_STATUS_PENDING;
  }

  return PAYMENT_STATUS_PENDING;
}

export function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const candidate = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(candidate)) {
    return candidate[0];
  }
  return candidate;
}

export function decryptWechatNotifyResource(resource: WechatNotifyResource, apiV3Key: string): string {
  if (!resource.ciphertext || !resource.nonce || resource.algorithm !== 'AEAD_AES_256_GCM') {
    throw new Error('invalid wechat notify resource');
  }

  const encrypted = Buffer.from(resource.ciphertext, 'base64');
  if (encrypted.length <= 16) {
    throw new Error('invalid wechat notify ciphertext');
  }

  const associatedData = resource.associated_data || '';
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);
  const authTag = encrypted.subarray(encrypted.length - 16);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(apiV3Key, 'utf8'),
    Buffer.from(resource.nonce, 'utf8'),
  );

  decipher.setAAD(Buffer.from(associatedData, 'utf8'));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
