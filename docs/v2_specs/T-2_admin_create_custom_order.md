# Feature Spec: [T-2] Admin Create Custom Order

**Status**: In Progress
**Task**: [T-2] 后台建单接口 (Admin Create Custom Order)
**PRD Reference**: 2.3 定制订单流程 (Revised: Unit Price * Duration, Mandatory Guide)

## Changelog
*   **2026-02-01**: Initial Draft.
*   **2026-02-02**: Clarified Currency Policy (Input Yuan, Store Cents, Return Cents).
*   **2026-02-03**: Added `guideId` as mandatory field. Added Frontend Integration Guide.
*   **2026-02-04**: Changed Input `guideId` to `guidePhone` (UX). Changed Input `pricePerHour` to **Cents** (Consistency). Added UI/UX Design details.

---

## 1. Context & User Story

*   **Context**: Custom orders are created by CS in the backend after offline negotiation.
*   **Logic**: `Total Amount = PricePerHour * Duration`.
*   **Mandatory Rule**: Every order MUST belong to a specific Guide.
*   **User Story**:
    > As a CS Agent, I create a custom order by entering user phone, **guide Phone**, hourly price (in Cents), duration, service time, and content description.

---

## 2. Technical Design

### 2.1 API Contract

*   **Endpoint**: `POST /api/admin/custom-orders`
*   **Permission**: `role: 'admin' | 'cs'`
*   **Request Body**:
    ```typescript
    {
      userPhone: string;       // Required. User must exist.
      guidePhone: string;      // Required. Guide must exist and be active. (Changed from guideId)
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

### 2.2 Currency Policy

*   **Input (API Request)**: **Cents** (Int). e.g., `5000`.
    *   *Reason*: Industry standard for consistency. Frontend handles conversion (Yuan -> Cents).
*   **Storage (DB)**: **Cents** (Int). e.g., `5000`.
*   **Output (API Response)**: **Cents** (Int).
*   **Frontend Display**: Divide response value by 100. e.g., `80000 / 100 = 800`.

### 2.3 Database Mapping

*   `orders` Table:
    *   `userId`: Resolved from `userPhone`.
    *   `guideId`: Resolved from `guidePhone`.
    *   `pricePerHour`: `body.pricePerHour` (No conversion).
    *   `duration`: `body.duration`.
    *   `serviceStartTime`: `new Date(body.serviceStartTime)`.
    *   `serviceAddress`: `body.serviceAddress`.
    *   `content`: `body.content`.
    *   `amount`: `pricePerHour * duration`.
    *   `type`: `'custom'`.
    *   `status`: `'pending'`.
    *   `creatorId`: Current Admin/CS ID.

---

## 3. Frontend Integration Guide

### 3.1 UI/UX Design
*   **Entry Point**: Admin Dashboard -> Order List -> Button "Create Custom Order" (Top Right).
*   **Modal Layout**:
    *   **Title**: "创建定制订单"
    *   **Section 1: User Info**
        *   `User Phone`: Input (11 digits). Auto-search/Validate on blur.
    *   **Section 2: Guide Info**
        *   `Guide Phone`: Input (11 digits). *Note: Input phone, backend finds User ID.*
    *   **Section 3: Service Details**
        *   `Price (Per Hour)`: Input (Type: Number, Step: 1, Unit: **Yuan**). *Display as ¥*.
        *   `Duration`: Input (Type: Number, Unit: Hours).
        *   `Total Amount`: Read-only. Auto-calculated (`Price * Duration`).
        *   `Start Time`: DateTime Picker.
        *   `Location`: Input (Text).
    *   **Section 4: Description**
        *   `Content`: Textarea (Service details).
        *   `Requirements`: Textarea (Optional).
    *   **Footer**:
        *   [Cancel]
        *   [Create Order] (Primary)

### 3.2 Data Logic
1.  **Form Input**:
    *   Price Input: User types `50` (Yuan). Frontend **MUST** multiply by 100 -> `5000` (Cents) before sending.
    *   Time Input: Use local time picker. Convert to ISO 8601 with offset (e.g., `moment().format()`) before sending.
    *   Guide Input: User types Phone Number (String).
2.  **Displaying Response**:
    *   The API returns `amount` in **Cents**.
    *   **MUST** divide by 100 before displaying.
    *   Example: `data.amount (80000) -> ¥800.00`.
3.  **Success Action**:
    *   On Success 201: Redirect to Order Detail Page (`/admin/orders/:id`).
    *   Allow CS to verify the created order immediately.

---

## 4. Implementation Checklist

*   [ ] **Step 1: Schema**: Update `server/schemas/admin.schema.ts` (guidePhone, pricePerHour Int).
*   [ ] **Step 2: Service**: Update `createCustomOrder` in `admin.controller.ts`.
    *   Resolve Guide by Phone.
    *   Remove Currency Conversion.
*   [ ] **Step 3: Route**: No change.

---

## 5. Verification Plan

*   **Script**: `scripts/verify-T2.ts`
*   **Cases**:
    1.  **Success**: Valid Inputs (Cents, GuidePhone) -> DB Check.
    2.  **Error - Guide Not Found**: Invalid Phone -> 404.
    3.  **Error - Currency**: Float input -> 400 (Zod Int check).
