# F-4 地陪钱包系统 (Guide Wallet System)

## 1. 概述
*   **PRD Reference**: 5.2 资金结算 & 流程9 (余额与提现)
*   **Goal**: 为地陪提供资金管理能力，包括查看余额、查看流水、发起提现。
*   **Scope**: 仅涉及 **地陪 (Guide)** 角色。
*   **Constraint**: 
    *   钱包逻辑仅处理 **收入 (Income)** 和 **提现 (Withdraw)**。
    *   **不包含退款 (Refund)**: C端退款由平台直接处理。
    *   **冻结资金**: 采用 **动态计算** 方案 (`SUM(pending withdrawals)`)，不在 `users` 表维护冗余字段。

## 2. 数据库设计 (Schema Changes)

### 2.1 `withdrawals` 表变更
*   **Status**: 简化为三态 `['pending', 'completed', 'rejected']`。
    *   `pending`: 审核中/冻结中。
    *   `completed`: 已打款。
    *   `rejected`: 已驳回 (资金解冻)。
*   **User Note**: 用户提交的收款账号信息。
*   **Admin Note**: 管理员的打款备注或驳回理由。

```typescript
// server/db/schema.ts
export const withdrawals = mysqlTable('withdrawals', {
  // ... existing fields
  status: mysqlEnum('status', ['pending', 'completed', 'rejected']).default('pending'),
  userNote: varchar('user_note', { length: 255 }), // 收款备注
  adminNote: varchar('admin_note', { length: 255 }), // 驳回理由/打款备注
});
```

### 2.2 `wallet_logs` 类型定义
*   `income`: 订单结算收入 (+)
*   `withdraw_freeze`: 提现申请冻结 (-)
*   `withdraw_unfreeze`: 提现驳回解冻 (+)
*   `withdraw_success`: 提现成功 (用于记录，金额为0或不记录)

## 3. 接口设计 (API Specification)

**Base URL**: `/api/v1/wallet`

### 3.1 获取钱包概览
*   **Endpoint**: `GET /summary`
*   **Response**:
    ```json
    {
      "code": 0,
      "data": {
        "balance": 10000,      // 可用余额 (users.balance)
        "frozen_amount": 2000  // 冻结资金 (SUM of pending withdrawals)
      }
    }
    ```

### 3.2 获取流水列表 (分页)
*   **Endpoint**: `GET /logs`
*   **Query**: `page=1&limit=10`
*   **Response**:
    ```json
    {
      "code": 0,
      "data": {
        "list": [
          {
            "id": 1,
            "type": "income",
            "amount": 5000,
            "title": "订单收入",
            "createdAt": "...",
            // 扩展字段 (Optional)
            "orderNumber": "20231001001", // 当 relatedType='order' 时返回
            "adminNote": "收款账号错误",    // 当 relatedType='withdrawal' 且有备注时返回
            "withdrawalStatus": "rejected" // 当 relatedType='withdrawal' 时返回
          }
        ],
        "pagination": {
          "total": 100,
          "page": 1,
          "pageSize": 10,
          "totalPages": 10
        }
      }
    }
    ```
    *   **后端逻辑**: 
        *   查询 `wallet_logs` 表。
        *   LEFT JOIN `orders` 获取 `orderNumber`。
        *   LEFT JOIN `withdrawals` 获取 `adminNote` 和 `status`。
    *   **UI/UX 规范**:
        *   **分页**: 默认每页 10 条。
        *   **颜色**: 
            *   收入/退回 (`income`, `withdraw_unfreeze`): **红色/橙色** (Text Red)。
            *   支出/冻结 (`withdraw_freeze`): **黑色** (Text Black/Gray)。
        *   **交互**: 
            *   点击列表项 -> 弹出详情 Dialog。
            *   **收入详情**: 展示关联订单号，并提供 "查看订单详情" 按钮 (跳转 `/orders/:id`)。
            *   **提现详情**: 展示提现状态 (Badge)。若状态为 `rejected`，展示 "驳回理由" (`adminNote`)。

### 3.3 发起提现申请
*   **Endpoint**: `POST /withdraw`
*   **Body**:
    ```json
    {
      "amount": 2000,
      "userNote": "微信: my_wx_id, 姓名: 张三"
    }
    ```
*   **Logic**:
    1.  Check Balance >= Amount.
    2.  Transaction:
        *   `users.balance` -= Amount.
        *   Insert `withdrawal` (status: pending).
        *   Insert `wallet_log` (type: withdraw_freeze, amount: -Amount).

## 4. 前端调用策略
*   进入钱包页时，**并行调用** `GET /summary` 和 `GET /logs`，实现最佳加载体验。

## 5. 验证验证计划 (Phase 1)
*   **Script**: `scripts/verify-wallet-flow.ts`
*   **Goal**: 验证钱包核心逻辑的原子性和一致性。

### 5.1 初始状态与收入 (Initial & Income)
1.  **Mock User**: 创建测试用户。
2.  **Verify Balance**: 初始余额应为 0。
3.  **Inject Income**: 直接修改 DB `balance = 10000` (模拟订单收入)。
4.  **Verify API**: `GET /summary` 返回 `balance: 10000`.

### 5.2 提现申请 (Withdraw Application)
1.  **Case A (余额不足)**: 申请 12000 -> 预期返回 400 Error.
2.  **Case B (正常申请)**: 申请 2000.
    *   **Response**: 200 OK.
    *   **DB Check**: `users.balance` = 8000.
    *   **DB Check**: `withdrawals` status = 'pending'.
    *   **DB Check**: `wallet_logs` type = 'withdraw_freeze', amount = -2000.
    *   **API Check**: `GET /summary` -> `balance: 8000`, `frozen_amount: 2000`.

### 5.3 审核模拟 (Audit Mock)
*   *Note: 暂无审核 API，直接操作 DB 验证逻辑一致性。*
1.  **Mock Reject**: 
    *   Update `withdrawals` status='rejected'.
    *   Update `users` balance += 2000.
2.  **Verify**: `GET /summary` -> `balance: 10000`, `frozen_amount: 0`.
