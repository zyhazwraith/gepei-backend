# 项目部署指南

本文档用于指导运维人员在生产环境中部署 Gepei App。

## 1. 环境准备

请确保服务器已安装以下软件：
- **Node.js**: v20+ (必需)
- **MySQL**: 8.0+
- **PM2**: `npm install -g pm2`

> **注意**: 本项目使用 React 19 和 Vite 7，**不支持 Node.js 18**，请务必升级到 Node.js 20 LTS。

## 2. 代码与依赖

```bash
# 1. 进入项目目录
cd gepei-backend

# 2. 安装依赖
# 注意：项目已包含 .npmrc 配置文件，会自动处理 peer-deps 冲突，无需额外参数
# 生产环境仍需安装 devDependencies 以支持 build 和运维脚本，请勿使用 --production
npm install
```

## 3. 配置环境变量

```bash
# 1. 基于模板创建配置文件
cp .env.example .env

# 2. 编辑配置
vim .env
```

**`.env` 必填项说明：**

```ini
# 数据库连接串 (优先使用)
# 格式: mysql://用户名:密码@主机名:端口/数据库名
# 注意: 如果密码包含特殊字符(如 @ # /), 必须进行 URL 编码 (例如 @ -> %40)
DATABASE_URL=mysql://root:your_secure_password@localhost:3306/gepei_db

# 腾讯地图 Key (必须保留 VITE_ 前缀)
VITE_TENCENT_MAP_KEY=您的腾讯地图Key
```

> **注意**: 环境变量优先级为 `系统环境变量` > `.env 文件`。如果在 PM2 配置或系统环境中设置了同名变量，将覆盖 `.env` 中的值。

## 4. 系统初始化

**步骤 0：创建数据库**
如果使用的是新部署的 MySQL，需手动创建数据库：
```bash
# 登录 MySQL
mysql -u root -p

# 执行创建语句
CREATE DATABASE gepei_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

**步骤 1：同步数据库结构**
```bash
npm run db:push
```

**步骤 2：创建管理员账号**
请替换下方命令中的手机号和密码进行初始化：
```bash
ADMIN_PHONE=13800000000 ADMIN_PASSWORD=您的强密码 npx tsx scripts/tool-setup-admin.ts
```

## 5. 构建与启动

```bash
# 1. 编译并启动服务
npm run build && pm2 start dist/server/server.js --name "gepei-app"

# 2. 配置开机自启 (防止服务器重启后服务挂掉)
pm2 save && pm2 startup
```

## 6. Nginx 代理配置 (HTTPS)

请将 `/path/to/cert` 替换为实际的 SSL 证书路径。

```nginx
# 1. HTTP 自动跳转 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

# 2. HTTPS 服务配置
server {
    listen 443 ssl;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;

    # 代理设置
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
