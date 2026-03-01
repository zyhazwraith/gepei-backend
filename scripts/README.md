# 脚本目录说明

该目录用途混合，请按以下分类用于交接。

## 核心脚本（建议纳入交接测试路径）
- `test-idempotency-cas.ts`

## 手动测试脚本（可选附录）
- `test-admin-guide-audit.ts`
- `test-admin-stats.ts`
- `test-attachment-system.ts`
- `test-audit-logs.ts`
- `test-auto-cancel.ts`
- `test-auto-settle.ts`
- `test-ban-flow.ts`
- `test-checkin-flow.ts`
- `test-custom-order-creation.ts`
- `test-overtime-flow.ts`
- `test-rbac-flow.ts`
- `test-refund-flow.ts`
- `test-system-config.ts`
- `test-user-list.ts`
- `test-user-refund-v2.1.ts`
- `test-wallet-flow.ts`
- `test-withdraw-audit.ts`

## Seed / 工具 / 调试（不要作为验收测试）
- `seed-*.ts`
- `tool-*.ts`
- `check-db-status.ts`
- `manual-sms-send.ts`
- `shared/*`

## 交接建议
- 核心交接优先包含：
  - `tests/integration/*`（活跃回归）
  - `tests/e2e/*`（前端 E2E）
  - `scripts/test-idempotency-cas.ts`
- 其余 `scripts/*` 建议作为可选运维/调试附录。
