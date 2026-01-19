# 地陪应用后端开发 - TODO

## FP-001: 项目初始化与环境配置 ✅

- [x] 初始化Node.js项目并配置package.json
- [x] 配置TypeScript (tsconfig.json)
- [x] 创建项目目录结构
- [x] 创建数据库初始化脚本 (database/init.sql)
- [x] 配置数据库连接 (src/config/database.ts)
- [x] 创建Express应用基础 (src/app.ts, src/server.ts)
- [x] 配置启动脚本 (dev/build/start)
- [x] 配置.gitignore
- [x] 提交FP-001代码到git并推送到GitHub

## FP-002: 用户注册功能 ✅

- [x] 创建认证路由 (src/routes/auth.routes.ts)
- [x] 创建认证控制器 (src/controllers/auth.controller.ts)
- [x] 创建数据库查询函数 (src/models/user.model.ts)
- [x] 实现注册API (POST /api/auth/register)
- [x] 功能测试通过
- [x] 提交FP-002代码到git并推送到GitHub

## FP-003: 用户登录功能 ✅

- [x] 实现登录API (POST /api/auth/login)
- [x] 密码验证功能
- [x] 功能测试通过
- [x] 提交FP-003代码到git并推送到GitHub

## FP-004: 获取当前用户信息

- [ ] 创建认证中间件 (src/middleware/auth.middleware.ts)
- [ ] 实现获取当前用户API (GET /api/auth/me)
- [ ] 更新路由配置
- [ ] 编写单元测试
- [ ] 提交FP-004代码到git并推送到GitHub
