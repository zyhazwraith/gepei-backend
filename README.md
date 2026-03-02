# Gepei 后端项目

基于 TypeScript + Express + MySQL 的后端服务（支持托管前端构建产物）。

## 运行环境要求
- Node.js >= 20
- MySQL 8.0+

## 快速开始
```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

服务默认信息：
- API 前缀：`/api/v1/*`
- 健康检查：`GET /health`

## 构建与启动
```bash
npm run build
npm start
```

## 环境变量
必填：
- `DATABASE_URL`
- `JWT_SECRET`（服务启动时强校验）

可选：
- `JWT_EXPIRES_IN`（默认 `7d`）
- `PORT`（默认 `3000`）
- `NODE_ENV`（默认 `development`）

部署细节请参考：
- `DEPLOY.md`
- `docs/DEPLOYMENT_CHECKLIST.md`

## 当前项目结构
```text
server/        # 后端运行时代码（app、routes、controllers、services、db、scheduler）
client/        # 前端源码
shared/        # 共享常量与类型
drizzle/       # 数据库迁移与元数据
scripts/       # 手动测试/初始化/工具脚本（见 scripts/README.md）
tests/         # 活跃与归档测试（见 tests/README.md）
docs/          # 现行文档与历史归档（见 docs/README.md）
```

## 测试入口
核心命令：
- `npm run test:e2e`（集成脚本组合）
- `npm run test:e2e:ui`（Playwright）
- `npm run test:api`（核心 API 集成脚本）
- `npm run test:idempotency`

测试目录约定：
- `tests/integration/*`：活跃后端回归
- `tests/e2e/*`：前端 E2E
- `tests/archive/*`：历史用例（默认不进流水线）

## 交接入口
- `HANDOVER_INDEX.md`

## 运行时策略配置（非敏感）
文件：`server/config/runtime.config.ts`

- 配置源：统一来自 `.env`（`runtime.config.ts` 负责读取/默认值/校验）
- 日志：统一前缀输出（`[API]` / `[SECURITY]` / `[SYSTEM]` / `[ERROR]`）
- 限流：Auth 关键接口内存限流（单实例）

默认值（未配置环境变量时）：
- `LOG_TIMEZONE=Asia/Shanghai`
- `THROTTLE_WINDOW_MS=60000`
- `THROTTLE_AUTH_MAX=20`
- `THROTTLE_VERIFICATION_CODE_MAX=5`（`/api/v1/auth/verification-code`）
