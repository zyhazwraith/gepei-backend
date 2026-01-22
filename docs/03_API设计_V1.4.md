# 陪你App - API设计文档 V1.4

**基础URL**: `https://api.gepei.com/api/v1`  
**认证方式**: Bearer Token (JWT)  
**响应格式**: JSON  
**版本**: V1.4 (LBS Update)  
**更新日期**: 2026年1月21日

---

## 变更记录 (Changelog)

| 版本 | 日期 | 变更内容 |
| :--- | :--- | :--- |
| V1.3 | 2026-01-20 | 定制单撮合流程升级 |
| V1.4 | 2026-01-21 | LBS 地理位置服务接口更新 (移除排序参数) |

---

## LBS 接口更新详情

### 6. 获取地陪列表 (Updated)

**端点**: `GET /guides`

**新增参数**:
- `lat` (query, float): 用户当前纬度 (可选)
- `lng` (query, float): 用户当前经度 (可选)
- `sort` (query, string): 排序方式。本版本**暂不**支持 `distance` 排序，仅支持默认排序。

**示例请求**:
`GET /guides?lat=39.9042&lng=116.4074`

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
        "reviewCount": 50,
        "distance": 2.5, // 距离(km)，仅在提供 lat/lng 时返回
        "latitude": 39.92,
        "longitude": 116.42
      }
    ]
  }
}
```

### 7. 获取地陪详情 (Updated)

**端点**: `GET /guides/{guide_id}`

**新增响应字段**:
- `latitude` (float)
- `longitude` (float)

**成功响应** (200):
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "guideId": 456,
    // ... 其他字段不变
    "latitude": 39.92,
    "longitude": 116.42
  }
}
```

### 8. 编辑地陪资料 (Updated)

**端点**: `POST /guides/profile`

**新增请求字段**:
- `latitude` (float, optional): 纬度
- `longitude` (float, optional): 经度

**请求体示例**:
```json
{
  "name": "张三",
  "city": "北京",
  "latitude": 39.920000,
  "longitude": 116.420000,
  // ... 其他字段
}
```

**成功响应** (200):
```json
{
  "code": 0,
  "message": "资料更新成功",
  "data": {
    "guideId": 456,
    "latitude": 39.920000,
    "longitude": 116.420000,
    // ...
  }
}
```

---

## 其他接口

其他接口保持 V1.3 版本不变，请参考 V1.3 文档。
