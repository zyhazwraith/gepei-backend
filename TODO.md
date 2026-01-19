# 地陪应用后端开发 - TODO

## 架构重构任务 ✅

- [x] 重命名src/为server/
- [x] 创建client/目录
- [x] 创建shared/目录
- [x] 修改API路径添加/v1版本号
- [x] 修改API响应格式为{code, message, data}
- [x] 创建shared/errorCodes.ts错误码定义
- [x] 修改所有控制器使用新的响应格式
- [x] 修改密码验证规则为8-20位包含字母和数字
- [x] 修改数据库字段命名为下划线风格
- [x] 提交重构代码到git

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

## FP-004: 获取当前用户信息 ✅

- [x] 创建认证中间件 (src/middleware/auth.middleware.ts)
- [x] 实现获取当前用户API (GET /api/auth/me)
- [x] 更新路由配置
- [x] JWT Token验证功能
- [x] 功能测试通过
- [x] 提交FP-004代码到git并推送到GitHub

## FP-001~FP-004 前端集成 ✅

- [x] 复制前端页面到client/目录
- [x] 创建API客户端配置 (client/src/lib/api.ts)
- [x] 创建Token存储工具 (client/src/utils/token.ts)
- [x] 创建认证Context (client/src/contexts/AuthContext.tsx)
- [x] 集成注册页面API调用
- [x] 集成登录页面API调用
- [x] 修改App.tsx添加AuthProvider
- [x] 配置vite代理
- [x] 删除tRPC相关代码
- [x] 修夏ES模块导入路径
- [x] 前后端联调测试
- [x] 提交前端集成代码到git
