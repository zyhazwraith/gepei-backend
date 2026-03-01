# scripts 文件级清理候选（待确认，不执行删除）

分支：`chore/handover-cleanup-cn`  
目的：降低交接噪音，明确哪些脚本不应作为默认交付主路径。

## 一、保留为核心（不建议归档）

- `test-idempotency-cas.ts`  
  原因：已接入 `package.json` 的 `test:idempotency`，属于明确的可执行回归入口。

## 二、保留为手动测试（不进默认流水线）

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

说明：这批脚本多数含本地环境假设（如 `localhost:3000`、固定账号/手机号），更适合作为手动验证工具集。

## 三、强烈建议归档候选（一次性/排障脚本）

- `check-db-status.ts`
- `debug-guide-photos.ts`
- `fix-test-data.ts`
- `inspect-attachment-keys.ts`

归档理由：
- 目标非常临时（排查或修补单点数据）
- 强依赖特定数据 ID（如固定 `userId`、固定 attachment id）
- 不具备通用回归价值

## 四、可选归档候选（环境初始化/数据种子）

- `seed-T2.ts`
- `seed-checkin-order.ts`
- `seed-cs-performance.ts`
- `seed-guides-local.ts`
- `seed-platform-finance.ts`
- `seed-wallet-logs.ts`
- `tool-create-cs.ts`
- `tool-reset-db.ts`
- `tool-setup-admin.ts`
- `verify-admin-api.ts`
- `verify-admin-user-v2.1.ts`
- `verify-guide-v2.ts`
- `manual-sms-send.ts`
- `shared/test-constants.ts`
- `shared/test-utils.ts`

建议：若你希望“交接包最小化”，可将以上移动到 `scripts/archive/`；若交接对象需要运维自助能力，可保留在 `scripts/` 并在 `scripts/README.md` 继续标注为“可选附录”。

## 五、风险注记（后续可单独治理）

以下模式在 scripts 中较普遍，建议后续统一治理：
- 硬编码地址：`http://localhost:3000/api/v1`
- 硬编码测试账号/密码：如 `19999999999` / `AdminPassword123` / `password123`
- 直接依赖内部 DB/service/model（适合内部脚本，不适合外部交付基线）

这些不一定是错误，但会降低“开箱即用”程度。
