# 陪你App - API设计文档 V1.3
## 基础信息

**基础URL**: `https://api.gepei.com/api/v1`  
**认证方式**: Bearer Token (JWT)  
**响应格式**: JSON
**命名规范**: 
- Request Body & Response Body 字段均使用 **Camel Case** (e.g., `userId`, `nickName`)。
- 只有 URL 路径参数使用 `snake_case` (e.g., `/orders/{order_id}`)。

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

(保持不变)

---

## 数据类型说明

| 类型 | 说明 | 示例 |
| :--- | :--- | :--- |
| phone | 手机号，11位 | "13800000000" |
| password | 密码，8-20位，包含字母和数字 | "password123" |
| token | JWT Token | "eyJhbGciOiJIUzI1NiIs..." |
| timestamp | Unix时间戳（秒） | 1674057600 |
| datetime | ISO 8601格式 | "2026-01-18T10:00:00Z" |
| idNumber | 身份证号，18位或17位+X | "110101199003071234" |
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
  "nickName": "张三"
}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "userId": 123,
    "phone": "13800000000",
    "nickName": "张三",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "isGuide": false
  }
}
```

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

**成功响应** (200):
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "userId": 123,
    "phone": "13800000000",
    "nickName": "张三",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "isGuide": false
  }
}
```

### 3. 获取当前用户信息

**端点**: `GET /auth/me`

**权限**: 需要认证

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": 123,
    "phone": "13800000000",
    "nickName": "张三",
    "avatarUrl": "https://...",
    "isGuide": false,
    "balance": 1000.00,
    "createdAt": "2026-01-01T10:00:00Z"
  }
}
```

### 4. 更新用户资料

**端点**: `POST /users/profile`

**权限**: 需要认证

**请求体**:
```json
{
  "nickName": "张三",
  "avatarUrl": "https://..."
}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "资料更新成功",
  "data": {
    "userId": 123,
    "phone": "13800000000",
    "nickName": "张三",
    "avatarUrl": "https://...",
    "isGuide": false,
    "balance": 1000.00,
    "createdAt": "2026-01-01T10:00:00Z"
  }
}
```

### 5. 文件上传

**端点**: `POST /upload`

**权限**: 需要认证

**成功响应** (200):
```json
{
  "code": 0,
  "message": "上传成功",
  "data": {
    "url": "https://api.gepei.com/uploads/20260118_abc123.jpg",
    "filename": "20260118_abc123.jpg",
    "size": 102400,
    "mimeType": "image/jpeg"
  }
}
```

---

## 地陪接口

### 6. 获取地陪列表

**端点**: `GET /guides`

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
        "guideId": 456,
        "userId": 123,
        "nickName": "张三",
        "city": "北京",
        "avatarUrl": "https://...",
        "hourlyPrice": 300,
        "intro": "我是一个专业地陪...",
        "tags": ["历史", "美食"],
        "rating": 4.8,
        "reviewCount": 50
      }
    ]
  }
}
```

### 7. 获取地陪详情

**端点**: `GET /guides/{guide_id}`

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "guideId": 456,
    "userId": 123,
    "nickName": "张三",
    "city": "北京",
    "avatarUrl": "https://...",
    "photos": ["https://...", "https://..."],
    "hourlyPrice": 300,
    "intro": "我是一个专业地陪...",
    "tags": ["历史", "美食"],
    "rating": 4.8,
    "reviewCount": 50,
    "createdAt": "2026-01-01T10:00:00Z"
  }
}
```

### 8. 编辑地陪资料

**端点**: `POST /guides/profile`

**请求体**:
```json
{
  "idNumber": "110101199003071234",
  "name": "张三",
  "city": "北京",
  "photos": ["https://...", "https://..."],
  "hourlyPrice": 300,
  "intro": "我是一个专业地陪...",
  "tags": ["历史", "美食"]
}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "资料更新成功",
  "data": {
    "guideId": 456,
    "userId": 123,
    "idNumber": "110101199003071234",
    "idVerifiedAt": "2026-01-18T10:00:00Z",
    "name": "张三",
    "city": "北京",
    "photos": ["https://...", "https://..."],
    "hourlyPrice": 300,
    "intro": "我是一个专业地陪...",
    "tags": ["历史", "美食"]
  }
}
```

---

## 订单接口

### 9. 创建定制订单

**端点**: `POST /orders`

**请求体**:
```json
{
  "type": "custom",
  "serviceDate": "2026-02-01",
  "serviceLocation": "北京市朝阳区",
  "serviceContent": "游览故宫和颐和园",
  "budget": 1000,
  "specialRequirements": "需要讲解历史"
}
```

**成功响应** (201):
```json
{
  "code": 0,
  "message": "订单创建成功",
  "data": {
    "orderId": 789,
    "userId": 123,
    "type": "custom",
    "status": "waiting_for_guide",
    "serviceDate": "2026-02-01",
    "serviceLocation": "北京市朝阳区",
    "serviceContent": "游览故宫和颐和园",
    "budget": 1000,
    "specialRequirements": "需要讲解历史",
    "createdAt": "2026-01-18T10:00:00Z"
  }
}
```

### 10. 获取订单列表（客户端）

**端点**: `GET /orders`

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
        "orderId": 789,
        "userId": 123,
        "type": "custom",
        "status": "waiting_for_guide",
        "serviceDate": "2026-02-01",
        "serviceLocation": "北京市朝阳区",
        "serviceContent": "游览故宫和颐和园",
        "budget": 1000,
        "createdAt": "2026-01-18T10:00:00Z"
      }
    ]
  }
}
```

### 11. 获取订单详情

**端点**: `GET /orders/{order_id}`

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderId": 789,
    "userId": 123,
    "guideId": 456,
    "type": "custom",
    "status": "in_progress",
    "serviceDate": "2026-02-01",
    "serviceLocation": "北京市朝阳区",
    "serviceContent": "游览故宫和颐和园",
    "budget": 1000,
    "specialRequirements": "需要讲解历史",
    "guideName": "张三",
    "guideAvatar": "https://...",
    "guidePhone": "13800000001",
    "totalPrice": 900,
    "paidAmount": 900,
    "paymentStatus": "paid",
    "createdAt": "2026-01-18T10:00:00Z",
    "completedAt": null,
    "cancelledAt": null
  }
}
```

### 12. 支付订单

**端点**: `POST /orders/{order_id}/payment`

**请求体**:
```json
{
  "paymentMethod": "wechat",
  "amount": 900
}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "支付成功",
  "data": {
    "orderId": 789,
    "paymentId": "PAY20260118001",
    "amount": 900,
    "status": "paid",
    "paidAt": "2026-01-18T10:00:00Z"
  }
}
```

### 13. 支付回调（Webhook）

**端点**: `POST /webhooks/payment`

**请求体**:
```json
{
  "orderId": 789,
  "paymentId": "PAY20260118001",
  "amount": 900,
  "status": "paid",
  "paidAt": "2026-01-18T10:00:00Z",
  "signature": "..."
}
```

---

## 管理后台接口

### 14. 管理员登录

**端点**: `POST /admin/login`

**成功响应** (200):
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "userId": 1,
    "phone": "13800000000",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "role": "admin"
  }
}
```

### 15. 获取订单列表（管理后台）

**端点**: `GET /admin/orders`

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
        "orderId": 789,
        "userId": 123,
        "userPhone": "13800000001",
        "type": "custom",
        "status": "waiting_for_guide",
        "serviceDate": "2026-02-01",
        "budget": 1000,
        "createdAt": "2026-01-18T10:00:00Z"
      }
    ]
  }
}
```

### 16. 推荐地陪

**端点**: `POST /admin/orders/{order_id}/recommend-guides`

**请求体**:
```json
{
  "guideIds": [456, 457, 458, 459, 460, 461]
}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "推荐成功",
  "data": {
    "orderId": 789,
    "recommendedGuides": [
      {
        "guideId": 456,
        "nickName": "张三",
        "avatarUrl": "https://...",
        "hourlyPrice": 300
      }
    ]
  }
}
```

### 17. 指派地陪 (管理员)

**端点**: `POST /admin/orders/{order_id}/assign`

**请求体**:
```json
{
  "guideId": 456
}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "指派成功",
  "data": {
    "orderId": 789,
    "guideId": 456,
    "status": "booked",
    "updatedAt": "2026-01-18T12:00:00Z"
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
