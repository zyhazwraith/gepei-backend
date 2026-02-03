# Feature Spec: [O-2] Auto Settle (自动结算)

**Status**: Draft
**PRD Reference**: 5.2 资金结算
**Dependents**: S-1 (Check-in), S-3 (Overtime)

## 1. Context & User Story
*   **Context**: 订单服务结束后，资金暂时冻结在平台。为了保障地陪收益，系统需在一定时间后（无投诉/退款）自动将资金划入地陪钱包。
*   **User Story**:
    *   **Guide**: "服务结束后，我希望在24小时后自动收到款项，不需要人工催促。"
    *   **Platform**: "系统应自动计算抽成，确保每一笔交易都能准确入账。"

## 2. Business Rules
1.  **Trigger Condition**:
    *   Order Status = `service_ended`
    *   Actual End Time (`actual_end_time`) < Current Time - 24 Hours
2.  **Financial Formula**:
    *   `Total Order Amount` = `orders.amount` (Includes base price + paid overtime fees).
    *   `Platform Fee` = `Total Order Amount * 25%`.
    *   `Guide Income` = `Total Order Amount - Platform Fee` (Floor to integer).
3.  **Atomic Transaction**:
    *   Update Order Status -> `completed`
    *   Update User Balance -> `balance += Guide Income`
    *   Insert Wallet Log -> `type: income`

## 3. Technical Implementation

### 3.1 Database
*   **Source**: `orders` (amount, guide_id, actual_end_time)
*   **Target**: `users` (balance), `wallet_logs` (insert)

### 3.2 Scheduler Job
*   **File**: `server/scheduler/settle.job.ts`
*   **Frequency**: Every 1 hour (e.g., `0 * * * *`).
*   **Logic**:
    1.  Find eligible orders (Limit 100 per run to avoid huge transactions).
    2.  Loop through each order and execute transaction individually (Isolation).
    3.  Log success/failure count.

### 3.3 Corner Cases
*   **Refunded Orders**: If an order is refunded during the 24h cooling period, its status changes to `refunded`. The job must filter by `status='service_ended'`, so refunded orders are naturally skipped.
*   **Overtime**: If overtime exists, `orders.amount` is already updated by S-3 logic. The job simply trusts `orders.amount`.

## 4. Verification Plan
*   **Script**: `scripts/test-auto-settle.ts`
*   **Steps**:
    1.  Create Order (Amount: 10000).
    2.  Mock Check-in End (Set `actual_end_time` to yesterday).
    3.  Run Job.
    4.  Assert: `wallet_logs` has +7500, `users.balance` increased by 7500.
