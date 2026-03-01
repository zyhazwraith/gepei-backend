# 地陪应用后端服务

基于 TypeScript + Express + MySQL 的地陪应用后端 RESTful API 服务。

## 技术栈

- **运行环境**: Node.js 18+
- **开发语言**: TypeScript
- **Web框架**: Express.js
- **数据库**: MySQL 8.0+
- **认证方式**: JWT (JSON Web Token)
- **密码加密**: bcryptjs

## 项目结构

```
gepei-backend/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器层
│   ├── middleware/      # 中间件
│   ├── models/          # 数据模型层
│   ├── routes/          # 路由层
│   ├── utils/           # 工具函数
│   ├── types/           # TypeScript类型定义
│   ├── app.ts           # Express应用配置
│   └── server.ts        # 服务器启动文件
├── database/
│   └── init.sql         # 数据库初始化脚本
├── tests/               # 测试文件
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
mysql -u root -p < database/init.sql
```

### 3. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 4. 构建生产版本

```bash
npm run build
npm start
```

## API 端点

### 健康检查

```
GET /health
```

### 认证相关

```
POST /api/v1/auth/register  # 用户注册（FP-002）
POST /api/v1/auth/login     # 用户登录（FP-003）
GET  /api/v1/auth/me        # 获取当前用户信息（FP-004）
```

## 开发进度

- ✅ FP-001: 项目初始化与环境配置
- 🚧 FP-002: 用户注册功能
- ⏳ FP-003: 用户登录功能
- ⏳ FP-004: 获取当前用户信息

## Git 分支管理

- `main` - 主分支，稳定版本
- `feature/FP-00X` - 功能分支

## 许可证

MIT
