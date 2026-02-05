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
- [x] **[F-1] 实现角色鉴权 (RBAC)** `[PRD 3.4]` `Status: Completed`
    - *Spec*: [Link](docs/v2_specs/F-1_rbac.md)
    - *User Story*: 系统根据 User `role` 字段 (admin/cs) 拦截越权请求。
    - *Tech*: Middleware update, Types update.
    - *Verification*: [x] scripts/verify-rbac.ts (Admin/CS/User Matrix).
- [x] **[F-2] 地陪资料升级 (Guide Profile)** `[PRD 3.3]` `Status: Completed`
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

- [x] **[T-1] 废弃旧接口 (Deprecation)** `[PRD 2.3]` `Status: Completed`
    - *User Story*: 旧版 App 无法再发起定制单或选择候选人。
    - *Tech*: Delete/Disable routes.
- [x] **[T-2] 后台建单接口 (Admin Create Custom Order)** `[PRD 2.3, 5.3]` `Status: Completed`
    - *Spec*: [Link](docs/v2_specs/T-2_admin_create_custom_order.md)
    - *User Story*: 客服在后台录入信息，生成“待支付”定制单。
    - *Backend*: [x] New API (`POST /admin/custom-orders`), [x] Detail API (`GET /admin/orders/:id`).
    - *Frontend*: [x] **[FE-T2]** 适配“定制单创建”弹窗 (Input: Phone, Price in Yuan -> Cents).
    - *Verification*: [x] API Test (scripts/verify-T2.ts), [x] E2E Test (tests/e2e/admin-custom-order.spec.ts).
- [x] **[T-3] 订单指派接口 (Assign Guide)** `[Cancelled]`
    - *Note*: Merged into T-2. Custom orders are assigned upon creation.
- [x] **[T-4] 前端: 客服联系流程 (CS Contact Flow)** `[PRD 1.1]` `Status: Completed`
    - *User Story*: 普通订单全流程可联系客服，待服务状态强引导；定制订单改为引导联系客服。
    - *Tech*: New `ContactCSDialog`, Update `OrderDetail` & `Custom` page, Fix `OrderCreate` param.
    - *Frontend*: [x] `Custom.tsx` as landing page, [x] `OrderDetail.tsx` with persistent button & QR code.
- [x] **[T-5] 统一支付回调 (Payment Callback)** `[PRD 1.1]` `Status: Deferred (Use Mock)`
    - *User Story*: 系统能正确处理普通/定制/加时单的微信支付回调。
    - *Strategy*: Use Mock Payment for MVP. Real Wechat Pay integration deferred to Pre-Launch.
    - *Backend*: Refactor callback handler.

---

## **Level 3: 服务与调度 (Service)**
*实现自动化流转。*

- [x] **[S-1] 打卡接口 (Check-in)** `[PRD 3.1]` `Status: Completed`
    - *User Story*: 地陪上传开始/结束照片，驱动订单状态流转。
    - *Tech*: New API (`POST /orders/:id/check-in`).
- [x] **[S-2] 调度器: 超时关单 (Auto Cancel)** `[PRD 1.1]` `Status: Completed`
    - *User Story*: 系统自动关闭创建 > 60m 未支付的订单 (实际执行: >75m)。
    - *Tech*: Node-cron job (5 min).
- [x] **[S-3] 加时下单接口 (Overtime)** `[PRD 2.4, 3.1]` `Status: Completed`
    - *User Story*: 用户在服务中发起加时，按实时费率支付。订单列表需展示聚合金额。
    - *Tech*: New API (`POST /orders/:id/overtime`). Update Order List API for aggregation.

---

## **Level 4: 运营与风控 (Ops)**
*后台管理核心能力。*

- [x] **[O-1] 地陪审核接口 (Guide Audit)** `[PRD 3.3]` `Status: Completed`
    - *User Story*: Admin 审核地陪并设置 `realPrice`。
    - *Tech*: API (`PUT /admin/guides/:id`), Frontend (`GuideAudit.tsx`).
- [x] **[O-2] 调度器: 自动结算 (Auto Settle)** `[PRD 3.2, 5.2]` `Status: Completed`
    - *User Story*: 订单结束 > 24h 自动完结，计算抽成入账。
    - *Tech*: Node-cron job (1 hour).
    - *Verification*: [x] scripts/test-auto-settle.ts (Order+Overtime -> Balance).
- [x] **[O-3] 退款接口 (Refund)** `[PRD 1.1, 3.4.3]` `Status: Completed`
    - *User Story*: Admin 发起退款，系统校验冷静期逻辑并执行微信退款。
    - *Tech*: New API with logic check.
    - *Frontend*: [x] Admin Order Detail Refund Dialog.
- [x] **[O-5] 封禁管理接口 (Ban)** `[PRD 3.3]` `Status: Completed`
    - *Spec*: [Link](docs/v2_specs/O-5_user_ban.md)
    - *User Story*: Admin 封禁/解禁账号 (Double Guard: Login + Middleware)。
    - *Tech*: New API (`PUT /ban`, `/unban`), Middleware Check.
    - *Verification*: [x] scripts/test-ban-flow.ts.
- [x] **[O-6] 统计报表接口 (Stats)** `[PRD 3.4.2]` `Status: Completed`
    - *User Story*: Admin 查看业绩报表。
    - *Tech*: New API (Aggregation queries).
- [x] **[O-7] 审计日志系统 (Audit System)** `[PRD 3.4.3]` `Status: Completed`
    - *User Story*: 系统记录关键操作 (如地陪审核)，Admin 可查询审计日志。
    - *Tech*: Shared Logger Module, Frontend Viewer, API (`GET /admin/audit-logs`).

---

## **Level 5: 资金体系 (Finance)**
*实现地陪资金管理与平台提现审核。*

- [x] **[F-4] 地陪钱包 (Guide Wallet)** `[PRD 5.2]` `Status: Completed`
    - *Spec*: [Link](docs/v2_specs/F-4_wallet_system.md)
    - *User Story*: 地陪查看余额与收支明细 (收入/提现)，并发起提现申请 (填写收款备注)。
    - *Note*: 仅涉及“收入”与“提现”，不包含退款逻辑（C端退款由平台处理，未结算资金不进入地陪钱包）。
    - *Tech*: Schema Update (`user_note`), `WalletService` (Income/Withdraw logic).
    - *Frontend*: `Wallet` Page, `WithdrawDialog`.
    - *Verification*: [x] scripts/verify-wallet-flow.ts.
- [x] **[O-4] 提现审核 (Withdraw Audit)** `[PRD 5.2]` `Status: Completed`
    - *Spec*: [Link](docs/v2_specs/O-4_withdraw_audit.md)
    - *User Story*: Admin 审核提现单，查看用户备注，线下打款后核销。
    - *Tech*: Admin API (`PUT /audit`).
    - *Frontend*: `AdminWithdrawList` Page.
    - *Verification*: [x] scripts/verify-admin-withdraw.ts.
