# 脚本目录说明

该目录只保留少量可维护脚本，避免与 `tests/` 自动化体系重叠。

## 核心脚本（建议纳入交接测试路径）
- `test-idempotency-cas.ts`

## 运维工具脚本
- `tool-setup-admin.ts`
- `tool-reset-db.ts`

## 交接建议
- 核心交接优先包含：
  - `tests/integration/*`（活跃回归）
  - `tests/e2e/*`（前端 E2E）
  - `scripts/test-idempotency-cas.ts`
- 运维初始化可按需执行 `tool-setup-admin.ts` 与 `tool-reset-db.ts`。
