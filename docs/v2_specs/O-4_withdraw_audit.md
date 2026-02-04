# O-4 提现审核系统 (Withdraw Audit System)

## 1. 概述
*   **Goal**: 允许管理员审核地陪的提现申请，处理线下打款后的核销或驳回操作。
*   **Scope**: 后台管理系统 (Admin Portal)。
*   **Prerequisites**: RBAC 权限 (Admin Role)。

## 2. 业务流程
1.  **查看申请**: 管理员查看状态为 `pending` 的提现申请列表，获取用户的收款信息 (`userNote`)。
2.  **线下打款**: 管理员根据收款信息，通过网银/支付宝等渠道进行转账。
3.  **系统核销**:
    *   **打款成功**: 在系统点击 "通过"，记录转账流水号（可选），状态变更为 `completed`。
    *   **打款失败/信息错误**: 点击 "驳回"，填写驳回理由，系统自动退还余额给地陪，状态变更为 `rejected`。

## 3. 接口设计 (API Specification)

**Base URL**: `/api/v1/admin/withdrawals`

### 3.1 获取提现列表
*   **Method**: `GET /`
*   **Query**:
    *   `page`: number (default 1)
    *   `limit`: number (default 10)
    *   `status`: 'pending' | 'completed' | 'rejected' (optional)
    *   `userId`: number (optional, search by user ID)
*   **Response**:
    ```json
    {
      "code": 0,
      "data": {
        "list": [
          {
            "id": 101,
            "userId": 10086,
            "userPhone": "13800138000",
            "amount": 50000, // 单位: 分
            "status": "pending",
            "userNote": "支付宝: 138xxxx, 姓名: 张三",
            "adminNote": null,
            "createdAt": "2023-10-27T10:00:00Z",
            "processedAt": null
          }
        ],
        "pagination": {
          "total": 50,
          "page": 1,
          "pageSize": 10,
          "totalPages": 5
        }
      }
    }
    ```

### 3.2 审核提现
*   **Full URL**: `/api/v1/admin/withdrawals/:id`
*   **Method**: `PUT`
*   **Body**:
    ```json
    {
      "status": "completed" | "rejected",
      "adminNote": "转账单号: 20231027xxxx" // 驳回时必填，通过时选填
    }
    ```
*   **Response**:
    ```json
    {
      "code": 0,
      "message": "Audit processed successfully"
    }
    ```
*   **Logic**:
    1.  **Check Status**: 必须为 `pending`，否则返回 400。
    2.  **If Status == 'completed'**:
        *   Update `withdrawals`: `status='completed'`, `adminNote=...`, `processedAt=now`.
        *   Insert `wallet_logs`: `type='withdraw_success'`, `amount=0`.
        *   Log Audit: `AUDIT_WITHDRAW` (Action: Approve).
    3.  **If Status == 'rejected'**:
        *   Validate: `adminNote` is not empty.
        *   Update `withdrawals`: `status='rejected'`, `adminNote=...`, `processedAt=now`.
        *   Refund Balance: `users.balance += withdrawals.amount`.
        *   Insert `wallet_logs`: `type='withdraw_unfreeze'`, `amount=withdrawals.amount`.
        *   Log Audit: `AUDIT_WITHDRAW` (Action: Reject).

## 4. 前端设计 (Frontend)

### 4.1 页面布局
*   **Path**: `/admin/withdrawals`
*   **Filters**:
    *   状态筛选 (Tabs): 全部 | 待审核 (Pending) | 已完成 | 已驳回
*   **Table Columns**:
    *   申请ID
    *   申请人 (头像 + 昵称 + 手机号)
    *   提现金额 (¥)
    *   收款信息 (`userNote`)
    *   申请时间
    *   状态
    *   操作 (审核按钮)

### 4.2 审核交互
*   点击 "审核" 按钮，弹出 Dialog。
*   **信息区**: 显示 申请人、金额、收款账号。
*   **表单区**:
    *   **审核结果**: [通过] [驳回] (Radio Group)
    *   **备注**: Textarea (驳回时 Placeholder="请输入驳回理由"，通过时 Placeholder="请输入转账流水号(可选)")
*   **确认**: 提交后刷新列表。

## 5. 验证计划
*   **Script**: `scripts/verify-admin-withdraw.ts`
    1.  Create a pending withdrawal.
    2.  Admin approves it -> Verify status and logs.
    3.  Create another pending withdrawal.
    4.  Admin rejects it -> Verify status, logs, and user balance refund.
