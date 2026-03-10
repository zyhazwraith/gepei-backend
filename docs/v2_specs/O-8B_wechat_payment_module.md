# O-8B 微信支付模块设计（JSAPI）

## 1. 目标与边界
目标:
- 将当前 mock 支付改造成“可直接切换实网”的真实架构。
- 订单状态改由“微信回调/查单确认”驱动，不再由前端请求直接改状态。

边界:
- 仅覆盖订单支付主链路（预支付、回调、查单、状态查询）。
- 退款实网可复用同一 provider 模式，但可在后续迭代完善。

## 2. 当前问题（基线）
- 现有 `POST /orders/:id/payment` 直接把订单改为 `waiting_service`，不符合真实支付一致性要求。
- `payments.transactionId` 使用 `MOCK_*`，无真实交易确认链路。
- 回调与查单兜底机制缺失。

## 3. 目标状态机
订单状态:
- `pending` -> `waiting_service`（仅支付确认成功时）

支付流水状态:
- `pending`（创建预支付后）
- `success`（回调或查单确认后）
- `failed`（下单失败或确认失败）

规则:
1. 创建预支付不改订单状态。
2. 订单状态迁移必须经过统一幂等函数。
3. 同一 `outTradeNo` 重复通知不重复记账。

## 4. 目标架构
### 4.1 Provider 抽象
建议文件:
- `server/services/payment/payment.provider.ts`（重构扩展）

```ts
export interface CreatePrepayParams {
  outTradeNo: string;
  description: string;
  amountFen: number;
  openid: string;
  notifyUrl: string;
}

export interface CreatePrepayResult {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: "RSA";
  paySign: string;
  prepayId: string;
}

export interface PayNotifyResult {
  outTradeNo: string;
  transactionId: string;
  amountFen: number;
  paidAt: Date;
  success: boolean;
}

export interface QueryOrderResult {
  outTradeNo: string;
  transactionId?: string;
  amountFen: number;
  status: "SUCCESS" | "NOTPAY" | "CLOSED" | "PAYERROR";
}

export interface IPaymentProvider {
  createPrepay(params: CreatePrepayParams): Promise<CreatePrepayResult>;
  parsePayNotify(rawBody: string, headers: Record<string, string>): Promise<PayNotifyResult>;
  queryOrder(outTradeNo: string): Promise<QueryOrderResult>;
}
```

实现:
- `MockWechatProvider`（本期联调）
- `WechatJsapiProvider`（资质完成后替换）

### 4.2 业务服务层
建议新增:
- `server/services/payment/payment.service.ts`

核心函数:
1. `createOrderPrepay(orderId, userId, authCode)`
2. `confirmOrderPaid(outTradeNo, transactionId, amountFen, paidAt)`
3. `syncOrderPaymentStatus(orderId)`（查单兜底）

### 4.3 控制器与路由
新增/改造:
1. `POST /api/v1/orders/:id/payment`
2. `POST /api/v1/payments/wechat/notify`
3. `GET /api/v1/orders/:id/payment-status`

## 5. API 合同
### 5.1 创建预支付
`POST /api/v1/orders/:id/payment`

请求体:
```json
{
  "paymentMethod": "wechat",
  "authCode": "wx_oauth_code"
}
```

响应:
```json
{
  "code": 0,
  "data": {
    "orderId": 123,
    "outTradeNo": "WX_ORD_123_1710000000_XYZ",
    "payParams": {
      "appId": "...",
      "timeStamp": "...",
      "nonceStr": "...",
      "package": "prepay_id=...",
      "signType": "RSA",
      "paySign": "..."
    }
  }
}
```

### 5.2 支付回调
`POST /api/v1/payments/wechat/notify`

输入:
- 原始 body（字符串）
- 微信签名相关 header

处理:
1. provider 验签与解密
2. 调 `confirmOrderPaid(...)` 幂等确认
3. 按微信协议返回成功

### 5.3 支付状态查询
`GET /api/v1/orders/:id/payment-status`

响应:
```json
{
  "code": 0,
  "data": {
    "orderId": 123,
    "paymentStatus": "pending",
    "orderStatus": "pending",
    "transactionId": null
  }
}
```

## 6. 数据模型与迁移
建议对 `payments` 增加字段:
1. `outTradeNo` `varchar(64)`（唯一）
2. `openidSnapshot` `varchar(64)`（记录本次支付 openid）
3. `prepayId` `varchar(128)`（可选，便于排障）
4. `rawNotifyId` `varchar(64)`（可选，回调审计）

建议索引:
- `uniq_out_trade_no(out_trade_no)`
- `idx_related(related_type, related_id)`

## 7. 幂等与并发控制
1. 创建预支付:
- 同一订单已存在 `pending/success` 支付单时策略需明确:
  - `success`: 直接返回已支付
  - `pending`: 复用或新建（推荐复用最近未过期单）

2. 回调幂等:
- 先按 `outTradeNo` 查支付单
- 若已 `success`，直接成功应答
- 否则事务内更新支付单并 CAS 更新订单状态

3. 统一确认函数:
- `confirmOrderPaid(...)` 只允许一次生效
- 金额校验失败直接拒绝并告警

## 8. 安全与审计
- 回调必须验签解密
- 校验 `appid/mchid/amount/currency`
- 回调日志脱敏保存（不记录明文敏感字段）
- 错误分级告警:
  - 验签失败
  - 金额不一致
  - 找不到本地 `outTradeNo`

## 9. 与微信联调拆分（支付模块）
1. 下单联调:
- 能稳定返回 `payParams`

2. 回调联调:
- 成功支付后订单能自动转 `waiting_service`
- 重复回调不重复记账

3. 查单联调:
- 人工触发查单可补齐漏回调状态

## 10. 测试清单
单元测试:
1. `createPrepay` 参数构建正确
2. `confirmOrderPaid` 幂等
3. 金额不一致拒绝状态迁移

集成测试:
1. 创建支付后订单仍 `pending`
2. 模拟回调后订单变 `waiting_service`
3. 重复回调只生效一次
4. 缺失回调时查询接口可触发查单补偿

回归测试:
1. 不影响现有退款申请入口
2. 不影响加时单支付逻辑（可后续复用同抽象）

## 11. 分阶段计划
Phase A（当前）:
1. Provider 抽象扩展
2. Mock 实现预支付/回调/查单
3. 改造订单支付主流程为异步确认
4. 上线支付状态查询

Phase B（资质完成后）:
1. 接入真实 `WechatJsapiProvider`
2. 实网回调验签与证书管理
3. 打通商户后台联调

## 12. 待确认项
1. 同订单重复发起支付时，`pending` 支付单是“复用”还是“每次重建”？
2. `GET /payment-status` 是否允许触发一次实时查单（可能增加微信 API 调用量）？
3. 回调失败重试告警阈值如何定义（例如连续5次失败）？
