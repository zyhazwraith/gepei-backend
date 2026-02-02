# Feature Spec: [S-1] Check-in & Order State Management
## 1. Overview
*   **Goal**: Define the "Check-in" process for Guides and the UI/UX for both Guides and Customers across the order lifecycle.
*   **Core Concept**: "Stack Layout" - Fixed Basic Info on top, Dynamic Status Card at the bottom.
*   **Interaction**: Guide must upload a photo FIRST, then click "Confirm" to check-in.

## 2. API Specification
### 2.1 Check-in Endpoint
*   **URL**: `POST /api/v1/orders/:id/check-in`
*   **Auth**: Guide Only (Must match `order.guideId`)
*   **Body**:
    ```json
    {
      "type": "start",       // "start" | "end"
      "attachmentId": 123,   // Required. ID from /api/v1/attachments/check_in
      "lat": 31.23,          // Required. Latitude (decimal)
      "lng": 121.47          // Required. Longitude (decimal)
    }
    ```
*   **Response**: `200 OK` with updated Order object.
*   **Logic**:
    *   **Start**: Valid if status is `waiting_service`. Updates status to `in_service`.
    *   **End**: Valid if status is `in_service`. Updates status to `service_ended`.
    *   **Record**: Inserts into `check_in_records` table.

## 3. Frontend Design (State Matrix)

### 3.1 Common Layout
*   **Header**: Standard Navigation.
*   **Top Section (Fixed)**: **OrderBasicInfo Component**
    *   Customer/Guide Avatar & Name.
    *   Service Time (Scheduled).
    *   Service Location (Text/Map).
*   **Bottom Section (Dynamic)**: **OrderStatusCard Component**

### 3.2 State: Waiting Payment (待支付)
*   **Status Enum**: `pending`
*   **Guide**: **Invisible** (Guide cannot see unpaid orders).
*   **Customer**:
    *   Text: "订单待支付"
    *   Action: **[立即支付]** (Button)
    *   Info: 倒计时 (60min).

### 3.3 State: Waiting Service (待服务)
*   **Status Enum**: `waiting_service`
*   **Guide**:
    *   Text: "请到达集合地点后，拍照打卡开始服务"
    *   Info: **预计收入: ¥XXX** (Order Amount * 75%)
    *   Action: 1. **[➕ 上传开始照]** (Upload Box) -> 2. **[确认开始服务]** (Button)
*   **Customer**:
    *   Text: "等待地陪到达..."
    *   Action: **[联系客服]** (Button, shows QR Code)

### 3.4 State: In Service (服务中)
*   **Status Enum**: `in_service`
*   **Guide**:
    *   Text: "服务进行中"
    *   Info: 已开始于 HH:mm | **预计收入: ¥XXX**
    *   Action: 1. **[➕ 上传结束照]** (Upload Box) -> 2. **[确认结束服务]** (Button)
*   **Customer**:
    *   Text: "服务进行中"
    *   Info: 开始打卡照 (Thumbnail)
    *   Action: **[申请加时]** (Button, Highlighted) | **[联系客服]**

### 3.5 State: Service Ended (服务结束)
*   **Status Enum**: `service_ended`
*   **Guide**:
    *   Text: "服务已结束，等待系统结算"
    *   Info: 结束打卡照 | 资金状态: **待结算** (不可提现)
*   **Customer**:
    *   Text: "服务已完成"
    *   Info: 结束打卡照
    *   Action: **[去评价]** (Button)

### 3.6 State: Completed (已结算)
*   **Status Enum**: `completed` (Auto-transition 24h after ended)
*   **Guide**:
    *   Text: "订单已结算"
    *   Info: 资金状态: **已入账** (可提现)
## 4. Order List View (Double Perspective)
### 4.1 Concept
Since Guide and Customer share the same App, the "Order List" must separate "Orders I Bought" from "Orders I Serve".

### 4.2 UI Design (Tab Layout)
*   **Default View (Customer Role)**: Tab "我预订的" (My Orders)
    *   API Param: `role=user` (Default)
    *   Content: Orders where `userId` = Me.
*   **Guide View (Guide Role)**: Tab "我服务的" (My Tasks)
    *   **Visibility**: Only visible if `user.isGuide === 1`.
    *   API Param: `role=guide`
    *   Content: Orders where `guideId` = Me.

### 4.3 Interaction
*   Clicking an order card navigates to the **same** Order Detail Page (`/orders/:id`).
*   The Detail Page internally adapts its view (Action Buttons) based on whether `currentUser.id === order.guideId`.

