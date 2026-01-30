# V2 重构任务清单 (V2 Refactor Task List)

**状态**: 待分配
**基准**: PRD V2.0 (Rev 4)
**策略**: 原子化功能拆分 (Atomic Feature Breakdown)

---

## **Level 1: 核心基座 (Foundation)**
*构建数据与权限的底座，Blocker 级别。*

- [x] **[F-0] 附件系统基础设施 (Attachment System)** `[Infrastructure]` `Status: Completed`
    - *Spec*: [Link](docs/v2_specs/F-0_attachment_system.md)
    - *User Story*: 系统提供统一的文件上传、压缩和存储服务。
    - *Backend*: [x] Service with Sharp, [x] Controller with Strategy, [x] Routes with RBAC.
    - *Verification*: [x] scripts/verify-F0.ts (Avatar Overwrite & System Config).
- [ ] **[F-1] 实现角色鉴权 (RBAC)** `[PRD 3.4]`
    - *User Story*: 系统根据 User `role` 字段 (admin/cs) 拦截越权请求。
    - *Tech*: Middleware update.
- [ ] **[F-2] 地陪资料升级 (Guide Profile)** `[PRD 3.3]`
    - *User Story*: 地陪可录入 LBS (lat/lng) 和相册；Admin 可查看并审核。
    - *Tech*: API update (`updateProfile`).
- [x] **[F-3] 系统配置接口 (System Config)** `[PRD 3.4.1]` `Status: Completed`
    - *Spec*: [Link](docs/v2_specs/F-3_system_config.md)
    - *User Story*: Admin 可上传/更新客服二维码 URL。
    - *Backend*: [x] Service (Whitelist), [x] Controller, [x] Routes (Public/Admin).
    - *Verification*: [x] scripts/verify-F3.ts.


---

## **Level 2: 交易闭环 (Transaction)**
*跑通“下单-支付”主链路。*

- [ ] **[T-1] 废弃旧接口 (Deprecation)** `[PRD 2.3]`
    - *User Story*: 旧版 App 无法再发起定制单或选择候选人。
    - *Tech*: Delete/Disable routes.
- [x] **[T-2] 后台建单接口 (Admin Create Custom Order)** `[PRD 2.3, 5.3]` `Status: Completed`
    - *Spec*: [Link](docs/v2_specs/T-2_admin_create_custom_order.md)
    - *User Story*: 客服在后台录入信息，生成“待支付”定制单。
    - *Backend*: [x] New API (`POST /admin/custom-orders`), [x] Detail API (`GET /admin/orders/:id`).
    - *Frontend*: [x] **[FE-T2]** 适配“定制单创建”弹窗 (Input: Phone, Price in Yuan -> Cents).
    - *Verification*: [x] API Test (scripts/verify-T2.ts), [x] E2E Test (tests/e2e/admin-custom-order.spec.ts).
- [ ] **[T-3] 订单指派接口 (Assign Guide)** `[PRD 2.3]`
    - *User Story*: 客服将已支付订单直接指派给特定地陪。
    - *Backend*: Update `assignGuide` logic.
    - *Frontend*: **[FE-T3]** 后台订单详情页增加“指派”按钮与选人弹窗.
- [ ] **[T-4] 普通单校验 (Standard Order Check)** `[PRD 2.2]`
    - *User Story*: 用户下单时，系统强制校验地陪是否有 `realPrice`。
    - *Backend*: Update `createOrder` logic.
    - *Frontend*: **[FE-T4]** App端下单页错误提示适配.
- [ ] **[T-5] 统一支付回调 (Payment Callback)** `[PRD 1.1]`
    - *User Story*: 系统能正确处理普通/定制/加时单的微信支付回调。
    - *Backend*: Refactor callback handler.
    - *Frontend*: N/A (Backend only).

---

## **Level 3: 服务与调度 (Service)**
*实现自动化流转。*

- [ ] **[S-1] 打卡接口 (Check-in)** `[PRD 3.1]`
    - *User Story*: 地陪上传开始/结束照片，驱动订单状态流转。
    - *Tech*: New API (`POST /orders/:id/check-in`).
- [ ] **[S-2] 调度器: 超时关单 (Auto Cancel)** `[PRD 1.1]`
    - *User Story*: 系统自动关闭创建 > 60m 未支付的订单。
    - *Tech*: Node-cron job (1 min).
- [ ] **[S-3] 加时下单接口 (Overtime)** `[PRD 2.4, 3.1]`
    - *User Story*: 用户在服务中发起加时，按实时费率支付。订单列表需展示聚合金额。
    - *Tech*: New API (`POST /orders/:id/overtime`). Update Order List API for aggregation.

---

## **Level 4: 运营与风控 (Ops)**
*后台管理核心能力。*

- [ ] **[O-1] 地陪审核接口 (Guide Audit)** `[PRD 3.3]`
    - *User Story*: Admin 审核地陪并设置 `realPrice`。
    - *Tech*: New API.
- [ ] **[O-2] 调度器: 自动结算 (Auto Settle)** `[PRD 3.2, 5.2]`
    - *User Story*: 订单结束 > 24h 自动完结，计算抽成入账。
    - *Tech*: Node-cron job (1 hour).
- [ ] **[O-3] 退款接口 (Refund)** `[PRD 1.1, 3.4.3]`
    - *User Story*: Admin 发起退款，系统校验冷静期逻辑并执行微信退款。
    - *Tech*: New API with logic check.
- [ ] **[O-4] 提现审核接口 (Withdraw)** `[PRD 3.2]`
    - *User Story*: Admin 确认打款后核销提现单。
    - *Tech*: Update withdraw API.
- [ ] **[O-5] 封禁管理接口 (Ban)** `[PRD 3.3]`
    - *User Story*: Admin 封禁/解禁账号。
    - *Tech*: New API.
- [ ] **[O-6] 统计报表接口 (Stats)** `[PRD 3.4.2]`
    - *User Story*: Admin 查看业绩报表。
    - *Tech*: New API (Aggregation queries).
- [ ] **[O-7] 审计日志查询接口 (View Audit Logs)** `[PRD 3.4.3]`
    - *User Story*: Admin 可按时间/操作人/类型筛选查看审计日志。
    - *Tech*: New API (`GET /admin/audit-logs`).
