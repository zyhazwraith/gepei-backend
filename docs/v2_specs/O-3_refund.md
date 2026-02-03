# O-3 退款系统 (Refund System)

**版本**: V1.0 (MVP)
**状态**: Draft
**对应任务**: [O-3]
**PRD 章节**: 1.1, 3.4.3, 5.3

---

## 1. 概述 (Overview)

允许超级管理员 (Super Admin) 对已支付订单执行退款操作。本阶段采用 **Manual Confirm (手工确认)** 模式，即管理员在线下完成退款后，在系统内录入金额与原因，变更订单状态。

## 2. 业务规则 (Business Rules)

### 2.1 权限与入口
*   **权限**: 仅限 `role = 'admin'` (超级管理员)。运营客服 (`cs`) 无权操作。
*   **入口**: Admin 后台 -> 订单详情页 -> "退款"按钮。

### 2.2 触发条件
仅以下状态的订单可发起退款：
1.  `paid` (已支付)
2.  `waiting_service` (待服务)

**单次限制**:
*   每个订单仅能执行一次退款。
*   若订单已有退款记录或状态为 `refunded`，拒绝操作。

### 2.3 退款策略
*   **金额**: 管理员手动输入。
    *   必须 > 0。
    *   必须 <= 订单实付金额 (Amount)。
*   **流程**:
    1.  校验订单状态。
    2.  校验是否已退款。
    3.  更新数据库状态 (Order + RefundRecord)。
    4.  (TODO) 记录审计日志。

### 2.4 状态流转
*   `paid` / `waiting_service` -> `refunded` (终态)

## 3. 数据模型 (Data Model)

### 3.1 数据库变更
*   **orders 表**:
    *   `status`: 更新为 `'refunded'`。
    *   `refund_amount`: 更新为输入金额。
    *   `updated_at`: 更新为当前时间。
*   **refund_records 表**:
    *   插入一条记录: `{ orderId, amount, reason, operatorId, createdAt }`。

## 4. API 设计 (API Specification)

### 4.1 执行退款
*   **Method**: `POST`
*   **URL**: `/api/v1/admin/orders/:id/refund`
*   **Headers**: `Authorization: Bearer <token>`
*   **Body**:
    ```json
    {
      "amount": 10000,
      "reason": "协商退款"
    }
    ```
*   **Response**:
    ```json
    {
      "code": 0,
      "message": "退款成功",
      "data": { "orderId": 123, "status": "refunded" }
    }
    ```

### 4.2 获取订单详情 (增强)
*   **Method**: `GET`
*   **URL**: `/api/v1/admin/orders/:id`
*   **Response Enhancement**:
    ```json
    {
      "code": 0,
      "data": {
        // ... existing fields
        "refund_amount": 10000,
        "refund_records": [
           { "amount": 10000, "reason": "...", "created_at": "..." }
        ]
      }
    }
    ```

## 5. 用户端影响 (Client Side)

### 5.1 Admin Console (Frontend)
*   **入口**: 订单详情弹窗 (`OrderDetailDialog`)。
*   **交互**:
    *   在 `Paid` 或 `WaitingService` 状态下，显示【退款】按钮 (Destructive Style)。
    *   点击按钮弹出确认对话框：
        *   **退款金额**: 默认为 `订单总额 - 150元` (自动计算违约金扣除)。
        *   **退款原因**: 默认为 "用户取消，扣除违约金 ¥150"。
        *   **动态展示**: 实时显示 "违约金扣除: ¥xx.xx"。
*   **展示**:
    *   退款成功后，订单详情页会显示红色的【退款信息】卡片，包含退款金额和原因。
    *   金额统一使用 `<Price />` 组件渲染。

### 5.2 User App
*   用户 App 订单详情页需同步展示：
    *   状态: `已退款`
    *   金额: `退款: ¥100.00` (从 `refund_amount` 读取)

## 6. 验证 (Verification)
*   `scripts/verify-O3.ts`: 覆盖后端逻辑（权限、状态、金额、单次限制）。
*   人工测试: 验证前端 Admin 退款弹窗的默认值计算与交互流程。
