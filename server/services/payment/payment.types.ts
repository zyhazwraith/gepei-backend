import {
  PAYMENT_METHOD_WECHAT,
  PAYMENT_RELATED_TYPE_ORDER,
  PAYMENT_RELATED_TYPE_OVERTIME,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
} from '../../constants/payment.js';

export type PaymentRelatedType = typeof PAYMENT_RELATED_TYPE_ORDER | typeof PAYMENT_RELATED_TYPE_OVERTIME;
export type PaymentStatus =
  | typeof PAYMENT_STATUS_PENDING
  | typeof PAYMENT_STATUS_SUCCESS
  | typeof PAYMENT_STATUS_FAILED;

export type PaymentMethod = typeof PAYMENT_METHOD_WECHAT;

export interface PrepayPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'RSA';
  paySign: string;
}

export interface PaymentIntent {
  relatedType: PaymentRelatedType;
  relatedId: number;
  amountFen: number;
  description: string;
}

export interface CreatePrepayInput {
  intent: PaymentIntent;
  paymentMethod: PaymentMethod;
  userId: number;
  sessionKey: string;
  authCode?: string;
  clientIp?: string;
}

export interface CreatePrepayResult {
  relatedType: PaymentRelatedType;
  relatedId: number;
  transactionId: string;
  paymentStatus: typeof PAYMENT_STATUS_PENDING;
  payParams: PrepayPayParams;
}

export interface PaymentStatusResult {
  transactionId: string;
  relatedType: PaymentRelatedType;
  relatedId: number;
  paymentStatus: PaymentStatus;
}

export interface ProviderCreatePrepayInput {
  transactionId: string;
  amountFen: number;
  openid: string;
  appId: string;
  description: string;
  clientIp?: string;
}

export interface ProviderCreatePrepayResult {
  payParams: PrepayPayParams;
  raw?: unknown;
}

export interface ProviderPaymentResult {
  transactionId: string;
  status: PaymentStatus;
  amountFen?: number;
  upstreamTransactionId?: string;
  paidAt?: Date;
  raw?: unknown;
}

export interface ProviderCreateRefundInput {
  outRefundNo: string;
  transactionId?: string;
  amountFen: number;
  totalAmountFen: number;
  reason: string;
  notifyUrl?: string;
}

export interface ProviderCreateRefundResult {
  outRefundNo: string;
  status: PaymentStatus;
  amountFen?: number;
  refundTransactionId?: string;
  raw?: unknown;
}

export interface ProviderRefundResult {
  outRefundNo: string;
  status: PaymentStatus;
  amountFen?: number;
  refundTransactionId?: string;
  successAt?: Date;
  raw?: unknown;
}

export interface ProviderNotifyInput {
  headers: Record<string, string | string[] | undefined>;
  rawBody: Buffer;
}

export interface IPaymentChannelProvider {
  createPrepay(input: ProviderCreatePrepayInput): Promise<ProviderCreatePrepayResult>;
  queryOrder(transactionId: string): Promise<ProviderPaymentResult>;
  parseNotify(input: ProviderNotifyInput): Promise<ProviderPaymentResult>;
  createRefund(input: ProviderCreateRefundInput): Promise<ProviderCreateRefundResult>;
  queryRefund(outRefundNo: string): Promise<ProviderRefundResult>;
  parseRefundNotify(input: ProviderNotifyInput): Promise<ProviderRefundResult>;
}
