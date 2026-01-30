# Feature Spec: [T-2] Admin Create Custom Order

**Status**: In Progress
**Task**: [T-2] 后台建单接口 (Admin Create Custom Order)
**PRD Reference**: 2.3 定制订单流程 (Revised: Unit Price * Duration, Mandatory Guide)

## Changelog
*   **2026-02-01**: Initial Draft.
*   **2026-02-02**: Clarified Currency Policy (Input Yuan, Store Cents, Return Cents).
*   **2026-02-03**: Added `guideId` as mandatory field. Added Frontend Integration Guide.
*   **2026-02-04**: Changed Input `guideId` to `guidePhone` (UX). Changed Input `pricePerHour` to **Cents** (Consistency). Added UI/UX Design details.
*   **2026-02-05**: Fixed API URL versioning (`/api/v1`). Changed Success Action to "Close & Refresh". Added Order Detail Modal spec and `GET /api/v1/admin/orders/:id` API.

---

## 1. Context & User Story

*   **Context**: Custom orders are created by CS in the backend after offline negotiation.
*   **Logic**: `Total Amount = PricePerHour * Duration`.
*   **Mandatory Rule**: Every order MUST belong to a specific Guide.
*   **User Story**:
    > As a CS Agent, I create a custom order by entering user phone, **guide Phone**, hourly price (in Cents), duration, service time, and content description.
    > After creation, I can view the order details in a popup to confirm accuracy.

---

## 2. Technical Design

### 2.1 API: Create Custom Order

*   **Endpoint**: `POST /api/v1/admin/custom-orders`
*   **Permission**: `role: 'admin' | 'cs'`
*   **Request Body**:
    ```typescript
    {
      userPhone: string;       // Required. User must exist.
      guidePhone: string;      // Required. Guide must exist and be active.
      pricePerHour: number;    // Required. Unit price in **Cents** (e.g., 5000 = 50 Yuan).
      duration: number;        // Required. Duration in Hours (Integer).
      serviceStartTime: string;// Required. ISO 8601 (e.g. "2026-02-01T09:00:00+08:00")
      serviceAddress: string;  // Required. Destination/Meeting Point.
      content: string;         // Required. Service Description (Text).
      requirements?: string;   // Optional. Remarks.
    }
    ```
*   **Response (Success 201)**:
    ```typescript
    {
      code: 0,
      message: "Custom order created successfully",
      data: {
        orderId: 123,
        orderNumber: "ORD...",
        status: "pending",
        amount: 80000,       // Unit: Cents (80000 = 800 Yuan)
        pricePerHour: 10000, // Unit: Cents (10000 = 100 Yuan)
        duration: 8
      }
    }
    ```

### 2.2 API: Get Order Details (New)

*   **Endpoint**: `GET /api/v1/admin/orders/:id`
*   **Permission**: `role: 'admin' | 'cs'`
*   **Purpose**: Allow admins to view full details of ANY order (bypassing user ownership check).
*   **Response (Success 200)**:
    ```typescript
    {
      code: 0,
      data: {
        id: number;
        orderNumber: string;
        status: string;
        amount: number;       // Cents
        pricePerHour?: number;// Cents (Custom Only)
        duration: number;
        serviceAddress: string;
        serviceStartTime: string;
        content: string; // Plain Text Description
        requirements: string;
        user: {
            phone: string;
            nickName: string;
        };
        guide: {
            phone: string;
            nickName: string;
        };
        createdAt: string;
      }
    }
    ```

### 2.3 Currency Policy

*   **Input (API Request)**: **Cents** (Int). e.g., `5000`.
    *   *Reason*: Industry standard for consistency. Frontend handles conversion (Yuan -> Cents).
*   **Storage (DB)**: **Cents** (Int). e.g., `5000`.
*   **Output (API Response)**: **Cents** (Int).
*   **Frontend Display**: Divide response value by 100. e.g., `80000 / 100 = 800`.

---

## 3. Frontend Integration Guide

### 3.1 UI/UX Design

#### A. Creation Modal
*   **Entry Point**: Admin Dashboard -> Order List -> Button "Create Custom Order" (Top Right).
*   **Layout**:
    *   **Title**: "创建定制订单"
    *   **Section 1: User Info**
        *   `User Phone`: Input (11 digits). Auto-search/Validate on blur.
    *   **Section 2: Guide Info**
        *   `Guide Phone`: Input (11 digits).
    *   **Section 3: Service Details**
        *   `Price (Per Hour)`: Input (Type: Number, Step: 1, Unit: **Yuan**). *Display as ¥*.
        *   `Duration`: Input (Type: Number, Unit: Hours).
        *   `Total Amount`: Read-only. Auto-calculated (`Price * Duration`).
        *   `Start Time`: DateTime Picker.
        *   `Location`: Input (Text).
    *   **Section 4: Description**
        *   `Content`: Textarea (Service details).
        *   `Requirements`: Textarea (Optional).
    *   **Footer**: [Cancel] [Create Order]

#### B. Order Detail Modal (New)
*   **Entry Point**: Click Order Number in Order List Table.
*   **Layout**:
    *   **Header**: Order #ORD... (Status Badge)
    *   **Grid Layout**:
        *   **Customer**: Name / Phone
        *   **Guide**: Name / Phone
        *   **Service**: Time / Duration / Location
        *   **Finance**: Total Amount (¥) / Unit Price (¥/h)
    *   **Content**: Full text description of service.
    *   **Timeline**: Created At / Paid At / Completed At.
    *   **Footer**: [Close] [Edit(Future)]

### 3.2 Data Logic
1.  **Form Input**:
    *   Price Input: User types `50` (Yuan). Frontend **MUST** multiply by 100 -> `5000` (Cents).
2.  **Success Action**:
    *   On Success 201:
        1.  **Close** the "Create Custom Order" modal.
        2.  **Show Toast**: "Order Created Successfully".
        3.  **Refresh** the Order List.
        4.  **Auto-Open** the "Order Detail Modal" for the newly created order (Allowing immediate verification).

---

## 4. Implementation Checklist

*   [ ] **Step 1: Schema**: Update `server/schemas/admin.schema.ts` (guidePhone, pricePerHour Int).
*   [ ] **Step 2: Service (Create)**: Update `createCustomOrder` in `admin.controller.ts`.
    *   Resolve Guide by Phone.
    *   Remove Currency Conversion.
*   [ ] **Step 3: Service (Get)**: Implement `getOrderDetails` in `admin.controller.ts` (New).
*   [ ] **Step 4: Route**: Update `server/routes/admin.routes.ts`.
    *   Ensure all routes use `/api/v1` prefix (in `app.ts`).
    *   Add `GET /orders/:id` route.

---

## 5. Verification Plan

*   **Script**: `scripts/verify-T2.ts`
*   **Cases**:
    1.  **Success**: Valid Inputs (Cents, GuidePhone) -> DB Check.
    2.  **Detail Check**: Call `GET /api/v1/admin/orders/:id` with Admin Token -> Expect 200 & Full Data.
    3.  **Error - Guide Not Found**: Invalid Phone -> 404.
    4.  **Error - Currency**: Float input -> 400 (Zod Int check).
