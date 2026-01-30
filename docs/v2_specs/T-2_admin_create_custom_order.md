# Feature Spec: [T-2] Admin Create Custom Order

**Status**: In Progress
**Task**: [T-2] 后台建单接口 (Admin Create Custom Order)
**PRD Reference**: 2.3 定制订单流程 (Revised: Unit Price * Duration, Mandatory Guide)

## Changelog
*   **2026-02-01**: Initial Draft.
*   **2026-02-02**: Clarified Currency Policy (Input Yuan, Store Cents, Return Cents).
*   **2026-02-03**: Added `guideId` as mandatory field. Added Frontend Integration Guide.

---

## 1. Context & User Story

*   **Context**: Custom orders are created by CS in the backend after offline negotiation.
*   **Logic**: `Total Amount = PricePerHour * Duration`.
*   **Mandatory Rule**: Every order MUST belong to a specific Guide.
*   **User Story**:
    > As a CS Agent, I create a custom order by entering user phone, **guide ID**, hourly price, duration, service time, and content description.

---

## 2. Technical Design

### 2.1 API Contract

*   **Endpoint**: `POST /api/admin/custom-orders`
*   **Permission**: `role: 'admin' | 'cs'`
*   **Request Body**:
    ```typescript
    {
      userPhone: string;       // Required. User must exist.
      guideId: number;         // Required. Guide must exist and be active.
      pricePerHour: number;    // Required. Unit price in Yuan (e.g., 50, 100).
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

*   **Input (API Request)**: **Yuan** (Float/Int). e.g., `50` or `50.5`.
    *   *Reason*: Convenience for human input in Admin Dashboard.
*   **Storage (DB)**: **Cents** (Int). e.g., `5000` or `5050`.
    *   *Reason*: Precision safety for financial calculations.
*   **Output (API Response)**: **Cents** (Int).
    *   *Reason*: Direct mapping from DB, standard for payment gateways (WeChat/Stripe).
*   **Frontend Display**: Divide response value by 100. e.g., `80000 / 100 = 800`.

### 2.3 Database Mapping

*   `orders` Table:
    *   `userId`: Resolved from `userPhone`.
    *   `guideId`: `body.guideId` (Validated).
    *   `pricePerHour`: `Math.round(body.pricePerHour * 100)`.
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

This section guides the Frontend Developer (or AI) on how to consume this API.

1.  **Form Input**:
    *   Price Input: Allow decimals (e.g., `100.5`). Send as-is (Yuan).
    *   Time Input: Use local time picker. Convert to ISO 8601 with offset (e.g., `moment().format()`) before sending.
2.  **Displaying Response**:
    *   The API returns `amount` in **Cents**.
    *   **MUST** divide by 100 before displaying.
    *   Example: `data.amount (80000) -> ¥800.00`.

---

## 4. Implementation Checklist

*   [ ] **Step 1: Schema**: Create `server/schemas/admin.schema.ts` (Zod) with `guideId` required.
*   [ ] **Step 2: Service**: Implement `createCustomOrder` in `admin.controller.ts`.
    *   Validate User existence.
    *   Validate Guide existence.
    *   Convert Currency (Yuan -> Cents).
*   [ ] **Step 3: Route**: Add to `admin.routes.ts`.

---

## 5. Verification Plan

*   **Script**: `scripts/verify-T2.ts`
*   **Cases**:
    1.  **Success**: Valid Inputs -> DB Check (amount=Price*Duration*100, guideId set).
    2.  **Error - No Guide**: `guideId` missing -> 400.
    3.  **Error - Invalid Guide**: `guideId` not found -> 404.
    4.  **Error - Currency**: `pricePerHour` negative -> 400.
