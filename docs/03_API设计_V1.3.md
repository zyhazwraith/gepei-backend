# 陪你App - API设计文档 V1.3

## 基础信息

**基础URL**: `https://api.gepei.com/api/v1`  
**认证方式**: Bearer Token (JWT)  
**响应格式**: JSON

---

## 通用响应格式

所有API响应都遵循以下格式：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

**字段说明**:
- `code`: 状态码，0表示成功，非0表示错误
- `message`: 状态消息
- `data`: 响应数据

---

## 错误码定义

| 错误码 | 说明 | HTTP状态码 |
| :--- | :--- | :--- |
| 0 | 成功 | 200 |
| 1001 | 手机号已注册 | 400 |
| 1002 | 手机号或密码错误 | 401 |
| 1003 | 用户不存在 | 404 |
| 1004 | Token过期或无效 | 401 |
| 1005 | 权限不足 | 403 |
| 1006 | 身份证号格式错误 | 400 |
| 1007 | 订单不存在 | 404 |
| 1008 | 订单状态不允许该操作 | 400 |
| 1009 | 余额不足 | 400 |
| 1010 | 参数错误 | 400 |
| 2001 | 服务器内部错误 | 500 |

---

## 数据类型说明

| 类型 | 说明 | 示例 |
| :--- | :--- | :--- |
| phone | 手机号，11位 | "13800000000" |
| password | 密码，8-20位，包含字母和数字 | "password123" |
| token | JWT Token | "eyJhbGciOiJIUzI1NiIs..." |
| timestamp | Unix时间戳（秒） | 1674057600 |
| datetime | ISO 8601格式 | "2026-01-18T10:00:00Z" |
| id_number | 身份证号，18位或17位+X | "110101199003071234" |
| price | 价格，单位为元，保留2位小数 | 299.99 |
| url | 图片或文件URL | "https://..." |

---

## 认证接口

### 1. 用户注册

**端点**: `POST /auth/register`

**权限**: 无需认证

**请求体**:
```json
{
  "phone": "13800000000",
  "password": "password123",
  "nickname": "张三"
}
```

**验证规则**:
- 手机号：11位数字，格式为1开头
- 密码：8-20位，包含字母和数字
- 昵称：2-20个字符
- 手机号不能重复

**成功响应** (200):
```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "user_id": 123,
    "phone": "13800000000",
    "nickname": "张三",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "is_guide": false
  }
}
```

**错误响应**:
- 1001: 手机号已注册
- 1010: 参数错误

---

### 2. 用户登录

**端点**: `POST /auth/login`

**权限**: 无需认证

**请求体**:
```json
{
  "phone": "13800000000",
  "password": "password123"
}
```

**验证规则**:
- 手机号：11位数字
- 密码：8-20位

**成功响应** (200):
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "user_id": 123,
    "phone": "13800000000",
    "nickname": "张三",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "is_guide": false
  }
}
```

**错误响应**:
- 1002: 手机号或密码错误
- 1003: 用户不存在

---

### 3. 获取当前用户信息

**端点**: `GET /auth/me`

**权限**: 需要认证

**请求头**:
```
Authorization: Bearer {token}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user_id": 123,
    "phone": "13800000000",
    "nickname": "张三",
    "avatar_url": "https://...",
    "is_guide": false,
    "balance": 1000.00,
    "created_at": "2026-01-01T10:00:00Z"
  }
}
```

**错误响应**:
- 1004: Token过期或无效

---

### 4. 更新用户资料

**端点**: `POST /users/profile`

**权限**: 需要认证

**请求体**:
```json
{
  "nickname": "张三",
  "avatar_url": "https://..."
}
```

**验证规则**:
- 昵称：2-20个字符（可选）
- 头像URL：合法的URL格式（可选）

**成功响应** (200):
```json
{
  "code": 0,
  "message": "资料更新成功",
  "data": {
    "user_id": 123,
    "phone": "13800000000",
    "nickname": "张三",
    "avatar_url": "https://...",
    "is_guide": false,
    "balance": 1000.00,
    "created_at": "2026-01-01T10:00:00Z"
  }
}
```

**错误响应**:
- 1004: Token过期或无效
- 1010: 参数错误

---

### 5. 文件上传

**端点**: `POST /upload`

**权限**: 需要认证

**请求头**:
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**请求体**:
- `file`: 文件数据（multipart/form-data）

**验证规则**:
- 文件类型：图片格式（jpg, jpeg, png, gif, webp）
- 文件大小：最大5MB

**成功响应** (200):
```json
{
  "code": 0,
  "message": "上传成功",
  "data": {
    "url": "https://api.gepei.com/uploads/20260118_abc123.jpg",
    "filename": "20260118_abc123.jpg",
    "size": 102400,
    "mime_type": "image/jpeg"
  }
}
```

**错误响应**:
- 1004: Token过期或无效
- 1010: 参数错误（文件类型或大小不符合要求）

**说明**:
- 文件存储在服务器本地文件系统
- 通过Express静态文件服务提供访问
- 文件名自动生成，包含时间戳和随机字符串，防止冲突和枚举

---

## 地陪接口

### 6. 获取地陪列表

**端点**: `GET /guides`

**权限**: 无需认证

**查询参数**:
```
?page=1&limit=10&city=北京&sort=rating
```

**参数说明**:
- page: 页码，默认1
- limit: 每页数量，默认10，最大100
- city: 城市过滤（可选）
- sort: 排序方式，可选值：rating（评分）、price（价格）、newest（最新）

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "items": [
      {
        "guide_id": 456,
        "user_id": 123,
        "nickname": "张三",
        "city": "北京",
        "avatar_url": "https://...",
        "hourly_price": 300,
        "intro": "我是一个专业地陪...",
        "tags": ["历史", "美食"],
        "rating": 4.8,
        "review_count": 50
      }
    ]
  }
}
```

---

### 7. 获取地陪详情

**端点**: `GET /guides/{guide_id}`

**权限**: 无需认证

**路径参数**:
- guide_id: 地陪ID

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "guide_id": 456,
    "user_id": 123,
    "nickname": "张三",
    "city": "北京",
    "avatar_url": "https://...",
    "photos": ["https://...", "https://..."],
    "hourly_price": 300,
    "intro": "我是一个专业地陪...",
    "tags": ["历史", "美食"],
    "rating": 4.8,
    "review_count": 50,
    "created_at": "2026-01-01T10:00:00Z"
  }
}
```

---

### 8. 编辑地陪资料

**端点**: `POST /guides/profile`

**权限**: 需要认证，且用户必须是地陪

**请求体**:
```json
{
  "id_number": "110101199003071234",
  "name": "张三",
  "city": "北京",
  "photos": ["https://...", "https://..."],
  "hourly_price": 300,
  "intro": "我是一个专业地陪...",
  "tags": ["历史", "美食"]
}
```

**验证规则**:
- 身份证号：18位数字或17位数字+X，格式校验
- 真实姓名：2-20个字符
- 城市：必选
- 照片：最多5张，每张不超过5MB
- 小时价格：正整数，范围100-10000
- 个人介绍：1-500个字符
- 技能标签：至少选择1个，最处5个

**成功响应** (200):
```json
{
  "code": 0,
  "message": "资料更新成功",
  "data": {
    "guide_id": 456,
    "user_id": 123,
    "id_number": "110101199003071234",
    "id_verified_at": "2026-01-18T10:00:00Z",
    "name": "张三",
    "city": "北京",
    "photos": ["https://...", "https://..."],
    "hourly_price": 300,
    "intro": "我是一个专业地陪...",
    "tags": ["历史", "美食"]
  }
}
```

**错误响应**:
- 1006: 身份证号格式错误
- 1010: 参数错误

---

## 订单接口

### 9. 创建定制订单

**端点**: `POST /orders`

**权限**: 需要认证

**请求体**:
```json
{
  "type": "custom",
  "service_date": "2026-02-01",
  "service_location": "北京市朝阳区",
  "service_content": "游览故宫和颐和园",
  "budget": 1000,
  "special_requirements": "需要讲解历史"
}
```

**验证规则**:
- type: 必须是"custom"（MVP只支持定制订单）
- service_date: 日期格式YYYY-MM-DD，不能早于今天
- service_location: 1-100个字符
- service_content: 1-500个字符
- budget: 正整数，范围100-50000
- special_requirements: 0-500个字符（可选）

**成功响应** (201):
```json
{
  "code": 0,
  "message": "订单创建成功",
  "data": {
    "order_id": 789,
    "user_id": 123,
    "type": "custom",
    "status": "waiting_for_guide",
    "service_date": "2026-02-01",
    "service_location": "北京市朝阳区",
    "service_content": "游览故宫和颐和园",
    "budget": 1000,
    "special_requirements": "需要讲解历史",
    "created_at": "2026-01-18T10:00:00Z"
  }
}
```

---

### 10. 获取订单列表（客户端）

**端点**: `GET /orders`

**权限**: 需要认证

**查询参数**:
```
?page=1&limit=10&status=waiting_for_guide
```

**参数说明**:
- page: 页码，默认1
- limit: 每页数量，默认10
- status: 订单状态过滤（可选），可选值：waiting_for_guide、in_progress、completed、cancelled

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "items": [
      {
        "order_id": 789,
        "user_id": 123,
        "type": "custom",
        "status": "waiting_for_guide",
        "service_date": "2026-02-01",
        "service_location": "北京市朝阳区",
        "service_content": "游览故宫和颐和园",
        "budget": 1000,
        "created_at": "2026-01-18T10:00:00Z"
      }
    ]
  }
}
```

---

### 11. 获取订单详情

**端点**: `GET /orders/{order_id}`

**权限**: 需要认证

**路径参数**:
- order_id: 订单ID

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "order_id": 789,
    "user_id": 123,
    "guide_id": 456,
    "type": "custom",
    "status": "in_progress",
    "service_date": "2026-02-01",
    "service_location": "北京市朝阳区",
    "service_content": "游览故宫和颐和园",
    "budget": 1000,
    "special_requirements": "需要讲解历史",
    "guide_name": "张三",
    "guide_avatar": "https://...",
    "guide_phone": "13800000001",
    "total_price": 900,
    "paid_amount": 900,
    "payment_status": "paid",
    "created_at": "2026-01-18T10:00:00Z",
    "completed_at": null,
    "cancelled_at": null
  }
}
```

---

### 12. 支付订单

**端点**: `POST /orders/{order_id}/payment`

**权限**: 需要认证

**路径参数**:
- order_id: 订单ID

**请求体**:
```json
{
  "payment_method": "wechat",
  "amount": 900
}
```

**验证规则**:
- payment_method: 支付方式，可选值：wechat、alipay
- amount: 支付金额，必须与订单金额一致

**成功响应** (200):
```json
{
  "code": 0,
  "message": "支付成功",
  "data": {
    "order_id": 789,
    "payment_id": "PAY20260118001",
    "amount": 900,
    "status": "paid",
    "paid_at": "2026-01-18T10:00:00Z"
  }
}
```

---

### 13. 支付回调（Webhook）

**端点**: `POST /webhooks/payment`

**权限**: 无需认证（微信/支付宝服务器调用）

**请求体**:
```json
{
  "order_id": 789,
  "payment_id": "PAY20260118001",
  "amount": 900,
  "status": "paid",
  "paid_at": "2026-01-18T10:00:00Z",
  "signature": "..."
}
```

**说明**:
- 此接口由微信/支付宝服务器调用，用于通知支付结果
- 需要验证签名，确保请求来自微信/支付宝
- 支付成功后，自动更新订单状态为"in_progress"

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success"
}
```

---

## 管理后台接口

### 14. 管理员登录

**端点**: `POST /admin/login`

**权限**: 无需认证

**请求体**:
```json
{
  "phone": "13800000000",
  "password": "admin123"
}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "user_id": 1,
    "phone": "13800000000",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "role": "admin"
  }
}
```

---

### 15. 获取订单列表（管理后台）

**端点**: `GET /admin/orders`

**权限**: 需要认证，且用户必须是管理员

**查询参数**:
```
?page=1&limit=10&status=waiting_for_guide&type=custom
```

**参数说明**:
- page: 页码，默认1
- limit: 每页数量，默认10
- status: 订单状态过滤（可选）
- type: 订单类型过滤（可选），可选值：custom、normal

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "items": [
      {
        "order_id": 789,
        "user_id": 123,
        "user_phone": "13800000001",
        "type": "custom",
        "status": "waiting_for_guide",
        "service_date": "2026-02-01",
        "budget": 1000,
        "created_at": "2026-01-18T10:00:00Z"
      }
    ]
  }
}
```

---

### 16. 推荐地陪

**端点**: `POST /admin/orders/{order_id}/recommend-guides`

**权限**: 需要认证，且用户必须是管理员

**路径参数**:
- order_id: 订单ID

**请求体**:
```json
{
  "guide_ids": [456, 457, 458, 459, 460, 461]
}
```

**验证规则**:
- guide_ids: 地陪ID数组，必须是6个有效的地陪ID
- 订单状态必须是"waiting_for_guide"

**成功响应** (200):
```json
{
  "code": 0,
  "message": "推荐成功",
  "data": {
    "order_id": 789,
    "recommended_guides": [
      {
        "guide_id": 456,
        "nickname": "张三",
        "avatar_url": "https://...",
        "hourly_price": 300
      }
    ]
  }
}
```

---

## 关键说明

### 未来功能（不在MVP实现）

以下功能已规划，将在后续版本实现：

1. **验证码功能** - 注册和登录的验证码验证
2. **微信登录** - 通过微信OAuth进行登录
3. **验证码登录** - 使用验证码替代密码登录
4. **地陪通知** - 管理员给定制订单选好地陪后通知客户
5. **评价系统** - 订单完成后的评价功能
6. **普通订单** - 直接预订地陪的订单功能

这些功能将在第二阶段开发。

### 幂等性

支付回调接口（/webhooks/payment）需要支持幂等性，即同一笔支付的重复回调应该返回相同的结果，不会重复更新订单状态。

### API版本

所有API都使用 `/api/v1` 前缀，便于未来版本升级。

### 认证

除了明确标注"无需认证"的接口外，其他接口都需要在请求头中包含有效的JWT Token：

```
Authorization: Bearer {token}
```

Token有效期为7天，过期后需要重新登录。

---

**文档版本**: V1.2  
**最后更新**: 2026-01-18  
**修改人**: 架构师
