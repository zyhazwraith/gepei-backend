# User Auto-Refund Spec (V2.1)

## 1. Context & Goal
*   **Goal**: Replace manual admin refund with user-initiated auto-refund.
*   **Trigger**: User clicks "Refund" on Order Detail page.
*   **Scope**: Orders in `PAID` or `WAITING_SERVICE` status.

## 2. Business Rules (V2.1)
1.  **Eligibility**:
    *   Status must be `PAID` or `WAITING_SERVICE`.
    *   User must be the owner of the order.
2.  **Refund Amount Calculation**:
    *   **Time Window**: Calculate time elapsed since `paidAt`.
    *   **Rule A (<= 1 Hour)**: Free refund. `RefundAmount = Order.amount`.
    *   **Rule B (> 1 Hour)**: Penalty applied. `RefundAmount = Max(0, Order.amount - 15000)`. (150 RMB penalty).
3.  **Process Flow**:
    *   User requests refund -> System calculates amount -> System calls Payment Gateway (Mock) -> System updates Order Status to `REFUNDED` -> System records transaction.

## 3. Technical Design

### 3.1 API
*   `POST /api/v1/orders/:orderNumber/refund`
    *   Auth: User Token
    *   Response:
        ```json
        {
          "success": true,
          "data": {
            "refunded_amount": 13500,
            "penalty_applied": true,
            "message": "Refund successful. Funds will be returned to your account within 1-3 business days."
          }
        }
        ```

### 3.2 Database
*   Update `orders` table:
    *   `status` -> `refunded`
    *   `refund_amount` -> Calculated amount
*   Insert into `refund_records`:
    *   `amount`: Calculated amount
    *   `reason`: "User Auto Refund (Penalty: [Yes/No])"

### 3.3 Payment Provider
*   Interface: `IPaymentProvider`
*   Mock Implementation: `MockWechatProvider` (Simulate API call to WeChat Pay)
    *   Behavior: Log request, return success immediately.

### 3.4 UI Guidelines
*   **Status Display**: Show order as `REFUNDED` immediately after success response.
*   **Prompt**: Display a static message/banner: "Refund processed. Funds will arrive in 1-3 business days."

## 4. Migration
*   Disable/Remove old `cancel` logic for paid orders to avoid conflict.
