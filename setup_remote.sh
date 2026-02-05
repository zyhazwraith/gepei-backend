#!/bin/bash
# Gepei Backend 初始化脚本

echo ">>> 开始初始化环境..."

# 1. 更新源
sudo apt update

# 2. 安装 Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 安装 MySQL 8.0
sudo apt install -y mysql-server

# 4. 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 5. 配置 MySQL 用户和密码 (适配 Drizzle)
# 创建一个名为 gepei_db 的数据库
sudo mysql -e "CREATE DATABASE IF NOT EXISTS gepei_db;"
# 修改 root 密码为 'Gepei@2026' 并使用 mysql_native_password
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Gepei@2026';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 6. 安装全局工具
sudo npm install -g pm2

echo ">>> ✅ 环境安装完成！"
echo "请运行: npm install 来安装项目依赖"
echo "然后运行: npm run dev 启动项目"
