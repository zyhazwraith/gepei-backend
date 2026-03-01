# 交接索引

本文档定义项目交接时推荐的阅读顺序与交付范围。

## 1）根目录文件（优先阅读）
1. `README.md`
2. `package.json`
3. `codex.md`
4. 构建/配置文件（`tsconfig*.json`、`vite.config.ts`、`drizzle.config.ts`）

## 2）部署与运行时
1. `DEPLOY.md`
2. `docs/DEPLOYMENT_CHECKLIST.md`
3. `server/server.ts`
4. `server/app.ts`

## 3）评审基线与结论
1. `docs/review_baseline.md`
2. `docs/review_phase1_discussion_2026-02-27.md`
3. `docs/review_phase2_scan_2026-02-28.md`
4. `docs/review_phase3_scan_2026-02-28.md`

## 4）后端运行时（`server/`）
- 保留当前全部运行时代码（controllers、routes、services、models、middleware、scheduler、db、utils）。
- 未经过“引用关系 + 构建验证”确认前，不删除任何后端运行时文件。

## 5）前端运行时（`client/`）
- 保留当前运行时代码。
- 后续仅清理已确认未引用的导入/工具函数。

## 6）测试（`tests/`）
1. `tests/README.md`（入口说明）
2. `tests/integration/*`（活跃后端回归）
3. `tests/e2e/*`（前端 E2E）
4. `tests/archive/*`（历史用例，默认不进流水线）

## 7）脚本（`scripts/`）
1. `scripts/README.md`（分类说明）
2. Core: `scripts/test-idempotency-cas.ts`
3. 手动测试附录：`scripts/test-*.ts`（除上面的 Core）
4. 运维/调试附录：`scripts/seed-*.ts`、`scripts/tool-*.ts`、`scripts/debug-*`、`scripts/manual-*`、`scripts/shared/*`

## 8）文档（`docs/`）
1. 活跃运维/评审文档：
   - `docs/DEPLOYMENT_CHECKLIST.md`
   - `docs/all-test-cases.md`
   - `docs/review_*`
2. 历史文档：
   - `docs/archive/**`（仅作追溯参考，默认不加载）

## 9）延期事项（不在本次交接清理范围）
1. 登录/鉴权限流与 API 滥用日志
2. 上传文件私有化访问模型重构
3. 多实例调度器加固（leader/lock）
4. 真实支付回调幂等迁移
