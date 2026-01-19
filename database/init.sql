-- 地陪应用数据库初始化脚本
-- 版本: 1.1
-- 创建日期: 2026-01-19

-- 创建数据库
CREATE DATABASE IF NOT EXISTS gepei_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gepei_db;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
  phone VARCHAR(11) NOT NULL UNIQUE COMMENT '手机号',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密后）',
  nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
  avatar_url VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  is_guide BOOLEAN DEFAULT FALSE COMMENT '是否为地陪',
  role ENUM('user', 'admin') DEFAULT 'user' COMMENT '用户角色',
  balance DECIMAL(10, 2) DEFAULT 0.00 COMMENT '余额',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间',
  INDEX idx_phone (phone),
  INDEX idx_is_guide (is_guide),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 地陪表
CREATE TABLE IF NOT EXISTS guides (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '地陪ID',
  user_id INT NOT NULL UNIQUE COMMENT '关联用户ID',
  name VARCHAR(50) NOT NULL COMMENT '真实姓名',
  id_number VARCHAR(18) NOT NULL UNIQUE COMMENT '身份证号',
  city VARCHAR(50) NOT NULL COMMENT '所在城市',
  intro TEXT DEFAULT NULL COMMENT '个人简介',
  hourly_price DECIMAL(10, 2) DEFAULT NULL COMMENT '小时价格',
  tags JSON DEFAULT NULL COMMENT '技能标签（JSON数组）',
  photos JSON DEFAULT NULL COMMENT '照片URL列表（JSON数组，最多5张）',
  id_verified_at TIMESTAMP NULL DEFAULT NULL COMMENT '身份认证时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_city (city),
  INDEX idx_user_id (user_id),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='地陪表';

-- 3. 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '订单ID',
  order_number VARCHAR(32) NOT NULL UNIQUE COMMENT '订单号',
  user_id INT NOT NULL COMMENT '下单用户ID',
  guide_id INT DEFAULT NULL COMMENT '地陪ID',
  order_type ENUM('normal', 'custom') NOT NULL COMMENT '订单类型：normal=普通订单，custom=私人定制',
  status ENUM('pending', 'paid', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '订单状态',
  service_date DATE DEFAULT NULL COMMENT '服务日期',
  service_hours INT DEFAULT NULL COMMENT '服务时长（小时）',
  amount DECIMAL(10, 2) NOT NULL COMMENT '订单金额',
  deposit DECIMAL(10, 2) DEFAULT 0.00 COMMENT '订金（私人定制）',
  requirements TEXT DEFAULT NULL COMMENT '服务要求',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE SET NULL,
  INDEX idx_order_number (order_number),
  INDEX idx_user_id (user_id),
  INDEX idx_guide_id (guide_id),
  INDEX idx_status (status),
  INDEX idx_order_type (order_type),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 4. 支付记录表
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '支付记录ID',
  order_id INT NOT NULL COMMENT '关联订单ID',
  payment_method ENUM('wechat') DEFAULT 'wechat' COMMENT '支付方式',
  transaction_id VARCHAR(64) DEFAULT NULL COMMENT '第三方交易ID',
  amount DECIMAL(10, 2) NOT NULL COMMENT '支付金额',
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending' COMMENT '支付状态',
  paid_at TIMESTAMP NULL DEFAULT NULL COMMENT '支付时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';

-- 5. 提现记录表
CREATE TABLE IF NOT EXISTS withdrawals (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '提现记录ID',
  user_id INT NOT NULL COMMENT '用户ID',
  amount DECIMAL(10, 2) NOT NULL COMMENT '提现金额',
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending' COMMENT '提现状态',
  bank_info JSON DEFAULT NULL COMMENT '银行卡信息（JSON）',
  processed_at TIMESTAMP NULL DEFAULT NULL COMMENT '处理时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提现记录表';

-- 6. 私人定制需求表
CREATE TABLE IF NOT EXISTS custom_requirements (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '需求ID',
  order_id INT NOT NULL UNIQUE COMMENT '关联订单ID',
  destination VARCHAR(100) NOT NULL COMMENT '目的地',
  start_date DATE NOT NULL COMMENT '开始日期',
  end_date DATE NOT NULL COMMENT '结束日期',
  people_count INT NOT NULL COMMENT '人数',
  budget DECIMAL(10, 2) DEFAULT NULL COMMENT '预算',
  special_requirements TEXT DEFAULT NULL COMMENT '特殊要求',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='私人定制需求表';

-- 7. 定制订单候选地陪表
CREATE TABLE IF NOT EXISTS custom_order_candidates (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '候选记录ID',
  order_id INT NOT NULL COMMENT '订单ID',
  guide_id INT NOT NULL COMMENT '地陪ID',
  is_selected BOOLEAN DEFAULT FALSE COMMENT '是否被选中',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_guide_id (guide_id),
  UNIQUE KEY unique_order_guide (order_id, guide_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定制订单候选地陪表';

-- 8. 评价表
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '评价ID',
  order_id INT NOT NULL UNIQUE COMMENT '关联订单ID',
  user_id INT NOT NULL COMMENT '评价用户ID',
  guide_id INT NOT NULL COMMENT '被评价地陪ID',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5) COMMENT '评分（1-5星）',
  comment TEXT DEFAULT NULL COMMENT '评价内容',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (guide_id) REFERENCES guides(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_guide_id (guide_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评价表';

-- 9. 管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_logs (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  admin_id INT NOT NULL COMMENT '管理员ID',
  action VARCHAR(100) NOT NULL COMMENT '操作类型',
  target_type VARCHAR(50) DEFAULT NULL COMMENT '目标类型（user/order/guide等）',
  target_id INT DEFAULT NULL COMMENT '目标ID',
  details JSON DEFAULT NULL COMMENT '操作详情（JSON）',
  ip_address VARCHAR(45) DEFAULT NULL COMMENT 'IP地址',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_admin_id (admin_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员操作日志表';

-- 初始化完成
SELECT 'Database initialization completed successfully!' AS message;
