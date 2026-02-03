# Feature Spec: Overtime Orders (S-3)

## 1. Context & User Story
*   **Goal**: Allow users to extend the service duration during an active order.
*   **Trigger**: User clicks "Request Overtime" in the App while order is `in_service`.
*   **Pricing**: Based on the **original order's hourly rate** (Snapshot).
*   **Interaction**: Overtime is an instant action. Users select duration -> Pay. No persistent "pending" card in UI history.

## 2. Technical Design

### 2.1 Database
*   **Table**: `overtime_records`
    *   `id`: PK
    *   `orderId`: FK -> orders.id
    *   `duration`: Hours (int)
    *   `fee`: Cents (int)
    *   `status`: 'pending' | 'paid' | 'cancelled'
*   **Table**: `orders`
    *   `amount`: **Total Amount** (Base + Paid Overtime).
    *   `totalDuration` (New Field): **Total Duration** (Base + Paid Overtime).
    *   `serviceEndTime`: Updated upon overtime payment.

### 2.2 API Design

#### A. Create Overtime
*   **Endpoint**: `POST /api/v1/orders/:id/overtime`
*   **Payload**: `{ duration: number }` (1-24)
*   **Logic**:
    1.  **Auth**: User must be the `userId` of the order.
    2.  **Check Status**: Order must be `in_service`.
    3.  **No Cleanup**: Do NOT cancel old pending records here. Allow history of attempts.
    4.  **Calculate**: `fee = duration * order.pricePerHour`.
    5.  **Insert**: Create new `pending` record.
    6.  **Return**: Overtime ID, Fee, Payment Info.

#### B. Pay Overtime (Mock)
*   **Endpoint**: `POST /api/v1/overtime/:id/pay`
*   **Payload**: `{ paymentMethod: 'wechat' }`
*   **Logic**:
    1.  **Check**: Overtime record must be `pending`.
    2.  **Transaction**:
        *   Update `overtime_records` -> `paid`.
        *   **Update Order Stats**:
            *   `amount += fee`
            *   `totalDuration += duration`
            *   `serviceEndTime = MAX(oldEndTime, NOW()) + duration`
        *   Insert `payments` record.
    3.  **Result**: Return success.

#### C. Get Order Details (Read)
*   **Endpoint**: `GET /api/v1/orders/:id`
*   **Logic**:
    *   Return `totalDuration` in root object.
    *   `overtimeRecords`: **Filter to return ONLY `paid` records**. Pending records are internal only.

### 2.3 Lifecycle & Cleanup
*   **Clean on Settle**:
    *   When order transitions to `completed` (via Auto-Settle or Admin), executing:
        `UPDATE overtime_records SET status='cancelled' WHERE order_id=? AND status='pending'`
    *   This ensures all "intentions" are closed when the main contract ends.

### 2.4 Frontend Design (Integration)

#### A. Status Card Integration (OrderDetail.tsx)
*   **Location**: Inside the Status Card (`bg-gradient-to-r from-orange-50`), below the status text.
*   **Condition**: `order.status === 'in_service'` AND `currentUser.role === 'user'`.
*   **Component**:
    ```tsx
    <Button 
      variant="outline" 
      className="mt-4 border-orange-200 text-orange-700 hover:bg-orange-100 w-full"
      onClick={() => setShowOvertimeSheet(true)}
    >
      <Clock className="w-4 h-4 mr-2" />
      申请加时服务
    </Button>
    ```

#### B. Price Breakdown Integration
*   **Location**: Inside "费用明细" Card.
*   **Content**:
    *   Add list of paid overtime records before the "Total" line.
    *   Format: `加时服务 (+2h) ... ¥200`.
    *   Total amount (`order.amount`) automatically reflects the sum, no frontend calculation needed.

#### C. Overtime Sheet (New Component)
*   **Component**: `OvertimeSheet.tsx` (using `Sheet` from shadcn).
*   **UI**:
    *   **Title**: "申请加时服务".
    *   **Duration Selector**: Chips/Radio (`+1小时`, `+2小时`, `+3小时`, `+4小时`).
    *   **Price Preview**: `预计费用: ¥XXX (单价: ¥Y/小时)`.
    *   **Action**: "确认支付 ¥XXX".
*   **Flow**: Select Duration -> API Create -> API Pay (Mock) -> Toast Success -> Refresh Order.

## 3. Implementation Checklist
*   [ ] DB: Add `total_duration` to `orders` schema.
*   [ ] Service: `createOvertime` (Simple insert).
*   [ ] Service: `payOvertime` (Complex update logic).
*   [ ] Service: `getOrderDetails` (Filter logic).
*   [ ] Service: Update `completeOrder` logic to clean pending overtimes.
*   [ ] Frontend: Create `OvertimeSheet` component.
*   [ ] Frontend: Update `OrderDetail` to integrate button and list.
