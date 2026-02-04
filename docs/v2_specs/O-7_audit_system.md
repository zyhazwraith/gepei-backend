# V2 Spec: [O-7] 审计日志系统 (Audit System)

> **Note**: 本文档定义了全平台的审计日志规范。
> **Constraint**: `details` 字段仅作**前端展示**及**留痕追溯**使用，不应基于此字段编写复杂业务逻辑。
> **Refactor**: 引入常量管理 (`server/constants/audit.ts`)，避免 Magic Strings。

## 1. Context & User Story
*   **目标**: 建立统一的审计日志记录机制，追踪关键后台操作（如审核、退款、配置修改），为后续的安全审计和问题排查提供依据。
*   **用户故事**:
    *   **Admin**: 可以查看后台操作日志，知道谁在什么时候修改了什么配置或审核了哪笔退款。
    *   **System**: 各业务模块在执行关键操作时，自动调用 Audit Service 记录日志。

## 2. Database Mapping & Schema

**Table**: `audit_logs` (Existing)

| 业务场景 | Action (Constant) | Target Type (Constant) | Target ID | Details (JSON) **[仅展示]** |
| :--- | :--- | :--- | :--- | :--- |
| **地陪审核** | `AUDIT_GUIDE` | `GUIDE` | `userId` | `{"result": "pass/reject", "real_price": 20000, "reason": "..."}` |
| **资金提现** | `AUDIT_WITHDRAW` | `WITHDRAWAL` | `withdrawalId` | `{"result": "pass/reject", "amount": 50000, "tx_id": "..."}` |
| **用户封禁** | `BAN_USER` | `USER` | `userId` | `{"reason": "...", "duration": "forever"}` |
| **用户解禁** | `UNBAN_USER` | `USER` | `userId` | `{"reason": "..."}` |
| **订单退款** | `REFUND_ORDER` | `ORDER` | `orderId` | `{"amount": 15000, "penalty": 150, "reason": "..."}` |
| **配置更新** | `UPDATE_CONFIG` | `SYSTEM_CONFIG` | 0 | `{"key": "...", "old": "...", "new": "..."}` |

## 3. Technical Implementation

### 3.1 Backend Service
*   **File**: `server/services/audit.service.ts`
*   **Method**: `log(operatorId, action, targetType, targetId, details, req)`
    *   Auto-extract IP from `req`.
    *   Save to DB using Drizzle ORM.

### 3.2 API (Admin)
*   **GET /api/v1/admin/audit-logs**
    *   **Query Params**:
        *   `page`: number (default 1)
        *   `limit`: number (default 20)
        *   `operator_id`: number (optional)
        *   `action`: string (optional)
        *   `target_type`: string (optional)
    *   **Response**:
        ```json
        {
          "code": 0,
          "message": "Success",
          "data": {
            "list": [
              {
                "id": 1,
                "operator_id": 101,
                "action": "audit_guide",
                "target_type": "guide",
                "target_id": 200,
                "details": { "result": "pass" },
                "ip_address": "127.0.0.1",
                "created_at": "..."
              }
            ],
            "pagination": {
              "total": 100,
              "page": 1,
              "page_size": 20,
              "total_pages": 5
            }
          }
        }
        ```

## 4. Frontend Implementation

### 4.1 UI Design
*   **Page**: `/admin/audit-logs`
*   **Components**:
    *   **Filter Bar**:
        *   `Action` (Select): audit_guide, audit_withdraw, etc.
        *   `Target Type` (Select): guide, order, user, etc.
        *   `Operator ID` (Input)
    *   **Data Table**:
        *   Columns: ID, Operator ID, Action, Target Type, Target ID, Details (Expandable/Popover), IP, Time.
        *   **Details Display**: Use a formatted JSON viewer or key-value list for `details` column.

### 4.2 API Client (`client/src/lib/api.ts`)
```typescript
export interface AuditLog {
  id: number;
  operatorId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

export const getAuditLogs = async (params: { 
  page: number; 
  limit: number; 
  action?: string; 
  target_type?: string 
}) => {
  return request.get<{ list: AuditLog[], pagination: Pagination }>('/admin/audit-logs', { params });
};
```
