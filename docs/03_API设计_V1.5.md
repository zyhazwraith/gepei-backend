# 陪你App - API设计文档 V1.5

**基础URL**: `/api/v1`  
**认证方式**: Bearer Token (JWT)  
**响应格式**: JSON  
**版本**: V1.5 (SSOT)  
**更新日期**: 2026年1月24日  
**用途**: 本文档定义当前代码库 (`server/routes`) 实际实现的 API 接口。

---

## 1. 通用说明

### 响应格式
所有接口返回统一的 JSON 结构：
```json
{
  "code": 0,          // 0: 成功, 非0: 错误码
  "message": "success", // 提示信息
  "data": {}          // 业务数据
}
```

### 认证
需要在 Request Header 中携带 Token：
`Authorization: Bearer <token>`

---

## 2. 认证模块 (Auth)

### 2.1 用户注册
- **URL**: `/auth/register`
- **Body**: `{ phone, password, nickname }`
- **Response**: `{ userId, phone, nickName, token, role }`
- **说明**: 如果未提供 `nickname`，系统将自动生成格式为 `用户` + `手机尾号` + `_` + `随机字符` 的默认昵称。

### 2.2 用户登录
- **URL**: `POST /auth/login`
- **Body**: `{ phone, password }`
- **Response**: `{ userId, phone, nickName, token, role }`
- **说明**: 管理员和普通用户使用同一接口，通过 `role` 字段区分。

### 2.3 获取当前用户信息
- **URL**: `GET /auth/me`
- **Auth**: Required
- **Response**: `{ userId, phone, nickName, role, isGuide, balance, ... }`

---

## 3. 用户模块 (Users)

### 3.1 更新用户资料
- **URL**: `POST /users/profile`
- **Auth**: Required
- **Body**: `{ nickName, avatarUrl }`
- **Response**: 更新后的用户信息

---

## 4. 地陪模块 (Guides)

### 4.1 获取地陪列表
- **URL**: `GET /guides`
- **Auth**: Optional
- **Query**: 
    - `page`, `page_size`
    - `city`, `keyword`
    - `lat`, `lng` (用户当前坐标，用于计算距离)
- **Response**: `{ list: [GuideItem], pagination: {} }`
    - `GuideItem` 包含 `distance` (如果提供了 lat/lng)。
    - `nickName`: 显示用户昵称（隐私保护，不显示真实姓名）。

### 4.2 获取地陪详情
- **URL**: `GET /guides/:id`
- **Auth**: Optional
- **Response**: 地陪详细信息 (包含 `latitude`, `longitude`, `photos` 等)。

### 4.3 获取当前用户的地陪资料
- **URL**: `GET /guides/profile`
- **Auth**: Required
- **Response**: 当前登录用户的地陪档案信息。

### 4.4 更新/申请地陪资料
- **URL**: `POST /guides/profile`
- **Auth**: Required
- **Body**: 
    - `name`, `idNumber`, `city` (必填)
    - `intro`, `hourlyPrice`, `tags`, `photos`
    - `latitude`, `longitude` (LBS 坐标)
- **Response**: 更新后的地陪信息。

---

## 5. 订单模块 (Orders)

### 5.1 创建订单
- **URL**: `POST /orders`
- **Auth**: Required
- **Body**: `{ type, serviceDate, ... }`
- **Response**: 创建成功的订单信息。

### 5.2 获取订单列表
- **URL**: `GET /orders`
- **Auth**: Required
- **Query**: `page`, `page_size`
- **Response**: 订单列表。

### 5.3 获取订单详情
- **URL**: `GET /orders/:id`
- **Auth**: Required
- **Response**: 订单详情 (包含关联的 guide 信息)。

### 5.4 支付订单
- **URL**: `POST /orders/:id/payment`
- **Auth**: Required
- **Body**: `{ paymentMethod, amount }`
- **Response**: 支付结果。

### 5.5 获取候选地陪 (定制单)
- **URL**: `GET /orders/:id/candidates`
- **Auth**: Required
- **Response**: 候选地陪列表。

### 5.6 选择地陪 (定制单)
- **URL**: `POST /orders/:id/select-guide`
- **Auth**: Required
- **Body**: `{ guideId }`
- **Response**: 确认选择结果。

---

## 6. 管理员模块 (Admin)

### 6.1 获取所有订单
- **URL**: `GET /admin/orders`
- **Auth**: Required (Role=admin)
- **Response**: 全局订单列表。

### 6.2 更新订单状态
- **URL**: `PUT /admin/orders/:id/status`
- **Auth**: Required (Role=admin)
- **Body**: `{ status }`

### 6.3 指派地陪 (定制单)
- **URL**: `POST /admin/orders/:id/assign`
- **Auth**: Required (Role=admin)
- **Body**: `{ guideIds: [] }` (地陪ID数组)

### 6.4 获取所有用户
- **URL**: `GET /admin/users`
- **Auth**: Required (Role=admin)

---

## 7. 文件上传 (Upload)

### 7.1 上传文件
- **URL**: `POST /upload`
- **Auth**: Required
- **Form-Data**: `file` (Binary)
- **Response**: `{ url, filename, ... }`
