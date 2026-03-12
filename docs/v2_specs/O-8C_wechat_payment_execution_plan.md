# O-8C 微信支付重构执行方案（最终讨论版）

## 1. 目标与边界
目标：
1. 分三步完成支付改造：先重构框架，再 Mock 联调，最后接入真实微信。
2. 订单支付与加时支付走同一支付主链路。
3. 统一按 `outTradeNo` 查询支付状态。

边界：
1. 仅覆盖支付主链路：预支付、notify、主动查询、补偿查询。
2. 退款链路不在本期。
3. O-8A OpenID 独立维护，支付侧只调用结果。

## 2. 架构结论
### 2.1 单服务方案（不拆 Gateway/Orchestrator 文件）
使用单一 `PaymentService`，但方法职责明确：
1. `createPrepay(...)`（统一入口，按 `relatedType/relatedId` 分流参数）
2. `handleNotify(...)`（解析通知并触发确认）
3. `queryAndSyncByTradeNo(...)`（主动查询并触发确认）
4. `confirmPaid(...)`（公共确认入口）

说明：
1. `confirmPaid(...)` 是公共逻辑，notify 和 query 都调用它。
2. 不新增第二个编排服务，保持实现简单。

### 2.2 业务落账位置
1. 支付确认成功后，`PaymentService` 只做分发。
2. 订单落账在 `OrderService.applyPaid(...)`。
3. 加时落账在 `OvertimeService.applyPaid(...)`。
4. Controller 不承载落账逻辑。

### 2.3 主动查询触发来源
1. 状态查询接口直接触发：`GET /api/v1/payments/:outTradeNo/status`
2. 定时任务触发：`jobs` 模块扫描 pending 并调用 `queryAndSyncByTradeNo(...)`

## 3. 统一数据约束
1. `payments` 是统一支付主表，订单与加时都写入该表。
2. 通过 `relatedType=order|overtime`、`relatedId` 分流业务。
3. `outTradeNo` 为统一查询主键（必须唯一）。
4. 当前库若无独立 `outTradeNo` 列，则迁移新增；不再复用语义不清的字段。

## 4. 运行流程（简化）
### 4.1 预支付
1. 前端请求订单/加时支付接口，传 `authCode`。
2. 后端解析 OpenID。
3. 创建本地 payment（`pending` + `outTradeNo`）。
4. 调微信下单，返回 `payParams` 给前端调起 JSAPI。

### 4.2 notify 回调
1. notify 接口收到微信回调。
2. `handleNotify(...)` 完成验签/解析。
3. 调 `confirmPaid(...)`：
   - 幂等（仅 `pending` 可迁移）
   - 金额校验
   - 分发到订单/加时落账

### 4.3 主动查询
1. 状态查询接口按 `outTradeNo` 查本地状态。
2. 若本地为 `pending`，调用 `queryAndSyncByTradeNo(...)` 查微信并同步。
3. 定时任务在 `jobs` 模块重复执行同样动作，做补偿。

## 5. 分阶段实施
### Phase 1：重构框架 + UT（不接真实微信）
领域功能点：
1. 完成 `PaymentService.createPrepay(...)` 统一预支付入口。
2. 完成 `confirmPaid(...)` 公共确认逻辑（幂等 + 金额校验 + 分发）。
3. 业务落账迁移到 `OrderService.applyPaid(...)` / `OvertimeService.applyPaid(...)`。
4. 在 `jobs` 模块新增补偿任务骨架（只负责触发调用）。

接口功能点：
1. `POST /api/v1/orders/:id/payment`
   - 入参：`paymentMethod`, `authCode`
   - 行为：创建预支付，返回 `outTradeNo + payParams`
2. `POST /api/v1/overtime/:id/pay`
   - 入参：`paymentMethod`, `authCode`
   - 行为：创建预支付，返回 `outTradeNo + payParams`
3. `GET /api/v1/payments/:outTradeNo/status`
   - 行为：查询本地状态；若 pending，则触发一次 `queryAndSyncByTradeNo(...)`
4. `POST /api/v1/payments/wechat/notify`（骨架）
   - 行为：接收通知并进入 `handleNotify(...)`（Phase 1 可先占位）

验收：
1. UT 全绿（见第 7 节）。
2. 预支付不改业务成功状态。
3. 上述接口都可调用，参数合同固定。
4. 查询接口与补偿任务入口可触发统一查询函数。

### Phase 2：接入 Mock 支付能力 + E2E
领域功能点：
1. `PaymentService` 内注入 Mock 外部交互实现（下单/通知解析/查单）。
2. 跑通 notify 和 query 两条成功确认链路。
3. 验证 notify/query 共享同一 `confirmPaid(...)`。

接口功能点：
1. `POST /api/v1/orders/:id/payment`、`POST /api/v1/overtime/:id/pay` 返回可用 mock `payParams`。
2. `POST /api/v1/payments/wechat/notify` 可完成 mock 通知确认。
3. `GET /api/v1/payments/:outTradeNo/status` 可触发 mock 查单并同步状态。
4. `jobs` 补偿任务可批量触发 mock 查单补偿。

验收：
1. E2E 关键链路通过。
2. 重复通知/重复查询不重复落账。

### Phase 3：接入真实微信支付
领域功能点：
1. 替换 Mock 外部交互为真实微信 SDK/API。
2. 完成 notify 验签解密、查单映射、错误码映射。
3. 保持 `confirmPaid(...)`、业务落账逻辑不变。

接口功能点：
1. `POST /api/v1/payments/wechat/notify` 接入真实回调协议。
2. `GET /api/v1/payments/:outTradeNo/status` 接入真实查单结果。
3. 预支付接口返回真实可调起的 `payParams`。

验收：
1. 沙箱/实网通过。
2. 对账一致，关键安全校验生效。

## 6. 命名建议（按当前讨论收敛）
1. 服务名：`PaymentService`（单一服务）
2. 统一预支付函数：`createPrepay`
   - 入参建议：`relatedType`, `relatedId`, `userId`, `paymentMethod`, `authCode`
3. 公共确认函数：`confirmPaid`
4. 主动查询函数：`queryAndSyncByTradeNo`
5. notify 处理函数：`handleNotify`
6. 业务落账函数：
   - `OrderService.applyPaid`
   - `OvertimeService.applyPaid`

## 7. 测试点（结构化）
### UT
1. 预支付创建：返回 `outTradeNo/payParams`，业务状态不变。
2. `confirmPaid` 成功：订单/加时分流正确。
3. 幂等：同一 `outTradeNo` 重复确认仅一次生效。
4. 金额校验失败：拒绝迁移，状态保持不变。
5. `queryAndSyncByTradeNo` 在查单成功时触发 `confirmPaid`。

### E2E / 集成
1. 订单预支付 -> pending。
2. 加时预支付 -> pending（确认写入统一 `payments`）。
3. notify 成功 -> 状态迁移正确。
4. 重复 notify/query -> 不重复落账。
5. `GET /payments/:outTradeNo/status` 可触发一次主动查询。
6. `jobs` 补偿任务可补齐 pending 成功单。

## 8. 简化策略（小团队）
1. 本期不做复杂失败终态编排，优先保证成功确认链路正确。
2. 本期先不做额外查询限流策略（后续按监控补）。
3. 仍需保留安全底线：验签、金额校验、幂等、唯一 tradeNo。
