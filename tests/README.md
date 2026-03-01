# 测试目录说明

## 活跃集成回归
- `tests/integration/test-core-api.ts`
- `tests/integration/test-booking-flow.ts`
- `tests/integration/test-payment-flow.ts`
- `tests/integration/test-lbs-flow.ts`
- `tests/integration/test-admin-flow.ts`
- `tests/integration/test-guide-assignment.ts`

运行方式：
- `npm run test:e2e`
- `npm run test:api`（仅核心 API）

## 归档/历史
- `tests/archive/*`

这些文件仅作历史参考，不属于默认回归流水线。

## 前端 E2E
- `tests/e2e/*.spec.ts`
- 运行命令：`npm run test:e2e:ui`
