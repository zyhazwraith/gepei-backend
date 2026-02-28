# Review Baseline (Phase 0)

Updated: 2026-02-27

## 1. Project Purpose (What it is for)

- A full-stack marketplace app for local guide services (customer + guide + admin/cs workflows), with core transaction flows around order creation, payment, service check-in/out, overtime, settlement, refund, and withdrawal.
- Product-level rules emphasize platform-only payment and strict order status management.

Evidence:
- `docs/08_Product_Requirements_Spec_V2.0.md:12`
- `docs/08_Product_Requirements_Spec_V2.0.md:15`
- `docs/08_Product_Requirements_Spec_V2.0.md:418`

Confidence: High (active PRD + code structure align on domain).

## 2. Runtime Architecture (What actually runs)

### 2.1 Deployment shape

- Monorepo, single Node process serves API and built SPA static assets.
- Express app mounts `/api/v1/*` routes and serves frontend fallback `index.html`.
- MySQL via Drizzle ORM.
- In-process scheduler starts with server process (`node-cron` jobs).

Evidence:
- `server/server.ts:27`
- `server/server.ts:35`
- `server/app.ts:57`
- `server/app.ts:79`
- `server/db/index.ts:20`
- `server/scheduler/index.ts:7`
- `docs/01_技术架构设计_V2.0.md:13`

Confidence: High.

### 2.2 Primary modules

- Backend: `server/controllers`, `server/services`, `server/routes`, `server/middleware`, `server/db`.
- Frontend: React + Vite (`client/src/*`) using axios API client with base `/api/v1`.
- Shared constants/types in `shared/`.

Evidence:
- `package.json:10`
- `package.json:13`
- `client/src/lib/api.ts:10`
- `client/src/App.tsx:35`

Confidence: High.

## 3. Data Model Snapshot (Production-relevant entities)

- Core tables present in schema: `users`, `guides`, `orders`, `overtime_records`, `payments`, `wallet_logs`, `withdrawals`, `refund_records`, `audit_logs`, `attachments`, `check_in_records`, `system_configs`.
- Orders use V2-style statuses (`pending`, `waiting_service`, `in_service`, `service_ended`, `completed`, `cancelled`, `refunded`) and keep monetary fields in fen (INT).

Evidence:
- `server/db/schema.ts:52`
- `server/db/schema.ts:75`
- `server/db/schema.ts:107`
- `server/db/schema.ts:114`
- `server/db/schema.ts:129`
- `docs/02_数据库设计_V2.0.md:78`

Confidence: High.

## 4. Core Runtime Flows (as implemented)

### 4.1 Order create and payment

- `POST /api/v1/orders` supports custom and normal flows (controller maps `type=normal` to DB `type=standard`).
- Payment is currently mock flow: inserts successful payment row and updates order status to `waiting_service`.

Evidence:
- `server/routes/order.routes.ts:9`
- `server/controllers/order.controller.ts:65`
- `server/controllers/order.controller.ts:158`
- `server/controllers/order.controller.ts:229`
- `server/controllers/order.controller.ts:242`

Confidence: High (implementation confirmed).

### 4.2 Check-in / service / overtime

- Guide check-in transitions `waiting_service -> in_service` (start), `in_service -> service_ended` (end).
- Overtime creates pending overtime record and mock overtime payment updates total amounts/duration and records payment.

Evidence:
- `server/routes/order.routes.ts:30`
- `server/services/order.service.ts:163`
- `server/services/order.service.ts:197`
- `server/services/order.service.ts:227`
- `server/services/order.service.ts:283`

Confidence: High.

### 4.3 Refund / withdrawal / settlement

- User-initiated refund is implemented through `OrderService.refundByUser`, using a mock payment provider abstraction.
- Withdraw audit includes optimistic status check and wallet log writes.
- Scheduler auto-cancel and auto-settle exist and run in-process.

Evidence:
- `server/controllers/order.controller.ts:270`
- `server/services/order.service.ts:20`
- `server/services/payment/payment.provider.ts:19`
- `server/services/withdraw.service.ts:95`
- `server/scheduler/auto-cancel.job.ts:8`
- `server/scheduler/settle.job.ts:108`

Confidence: High.

## 5. Security and Auth Baseline

- JWT auth middleware loads user by token payload and applies ban-state check.
- Admin routes are split between admin-only and admin/cs-shared APIs.
- JWT has a hardcoded fallback secret if env var is missing.

Evidence:
- `server/middleware/auth.middleware.ts:19`
- `server/middleware/auth.middleware.ts:41`
- `server/routes/admin.routes.ts:29`
- `server/routes/admin.routes.ts:67`
- `server/utils/jwt.ts:5`

Confidence: High.

## 6. Environment and Runtime Assumptions

- Node engine requirement is `>=20.0.0`.
- Database connection primarily uses `DATABASE_URL`.
- Frontend API base defaults to `/api/v1`.

Evidence:
- `package.json:6`
- `server/db/index.ts:10`
- `client/src/lib/api.ts:10`
- `DEPLOY.md:8`

Confidence: High.

## 7. Doc-Code Drift (Important for Future Inference)

### 7.1 Documentation index drift

- `docs/README.md` still points to V1.x doc names that are no longer canonical for current V2 work.

Evidence:
- `docs/README.md:8`
- `docs/01_技术架构设计_V2.0.md:1`
- `docs/02_数据库设计_V2.0.md:1`

Confidence: High.

### 7.2 Root README is stale

- Root `README.md` describes old `src/` structure and Node 18+ requirement; actual project uses `server/` + `client/`, and package/deploy require Node 20+.
- Root README API examples omit `/v1`, while runtime mounts `/api/v1/*`.

Evidence:
- `README.md:7`
- `README.md:18`
- `README.md:76`
- `package.json:6`
- `server/app.ts:58`
- `DEPLOY.md:8`

Confidence: High.

### 7.3 Payment reality vs target architecture

- V2 architecture docs describe WeChat Pay SDK integration, but runtime provider is mock and pre-launch checklist still marks real payment callback as blocker.

Evidence:
- `docs/01_技术架构设计_V2.0.md:63`
- `server/services/payment/payment.provider.ts:19`
- `docs/PRE_LAUNCH_CHECKLIST.md:4`

Confidence: High.

### 7.4 Scheduler cadence mismatch

- Architecture doc says auto-cancel scans every minute; implementation runs every 5 minutes.

Evidence:
- `docs/01_技术架构设计_V2.0.md:73`
- `server/scheduler/auto-cancel.job.ts:8`

Confidence: Medium (business intent may accept this, but drift exists).

### 7.5 Route comments vs actual mount prefix

- Some route file comments still show `/api/auth/*`, while mounted path is `/api/v1/auth/*`.

Evidence:
- `server/routes/auth.routes.ts:8`
- `server/app.ts:58`

Confidence: High.

## 8. Baseline Use Rules for Next Phases

- Treat this file as a Phase 0 reference artifact for future risk reviews.
- When docs conflict with implementation, prefer runtime/schema behavior and log drift.
- Treat tests/scripts as weak evidence unless confirmed by runtime code and schema.

Confidence: High (aligned with current `codex.md` protocol).
