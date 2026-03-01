# 临时扫描进度（仅本轮使用）

## 执行顺序（固定）
1. 代码目录优先：`server/` -> `client/src/` -> `shared/` -> `drizzle/` -> `scripts/` -> `tests/`
2. 根配置与运行文件：`package.json`、`tsconfig.json`、`vite.config.ts`、`playwright.config.ts`、`DEPLOY.md`、`README.md`、`HANDOVER_INDEX.md`、`codex.md`
3. 文档目录最后：`docs/`（集中一次性更新，不在中途改）

## 已扫描
- [x] `server/`：未发现可直接删除的死文件。
- [x] `client/src/`：已清理无引用组件/工具文件（当前均可构建）。
- [x] `shared/`：均有运行时引用，保留。
- [x] `drizzle/`：迁移与 meta 结构有效，保留。
- [x] `scripts/`：已压缩为可维护核心脚本集。
- [x] `tests/`：活跃集成与 E2E 结构可用。
- [x] 根配置与运行文件：已完成扫描。
- [x] `docs/`：已做最终只读校验（未发现真实失效路径；通配符路径为文档写法，不是缺失文件）。

## 待扫描
- [ ] 无（本轮扫描已完成）

## 待决策（不自动删除）
- [x] `plan.md`：已删除（无引用历史计划文档）。
- [x] `ui-designs/`：已删除（非运行时依赖设计资产）。
- [x] `setup_remote.sh`：已删除（含固定 root 密码写法，存在误用风险）。
- [x] `ecosystem.config.cjs`：保留（生产环境 PM2 部署相关文件）。

## 规则
- 扫描过程中不更新文档进度文件以外的文档。
- 只有在整批扫描结束后，才统一提交文档改动。
