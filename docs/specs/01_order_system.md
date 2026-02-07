# Order System Specification

## 1. Overview
This document outlines the architecture and data flow for the Order System, specifically focusing on financial calculations and persistence.

## 2. Financial Model

### 2.1 Commission Rate
- **Role**: Platform Commission
- **Value**: 25% (`0.25`)
- **Definition**: The percentage of the total order amount that the platform retains as service fee.
- **Source of Truth**: Backend constant `PLATFORM_COMMISSION_RATE` in `server/shared/constants.ts`.

### 2.2 Income Calculation
- **Formula**: `Guide Income = Total Amount * (1 - Commission Rate)`
- **Persistence**: 
  - Field: `orders.guide_income` (INT, cents)
  - Purpose: To store the immutable calculated income for the guide, ensuring historical accuracy even if rates change.

## 3. Database Schema Changes

### Table: `orders`

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `amount` | `int` | No | - | **Base Amount**. The original price of the order (e.g., deposit or full price). |
| `total_amount` | `int` | No | `0` | **[New] Total Revenue**. `amount` + Sum of all paid overtime fees. |
| `guide_income` | `int` | No | `0` | **[New] Guide Income**. The actual income allocated to the guide (in cents). |

## 4. Data Flow

### 4.1 Order Creation
1. User places an order with `amount`.
2. Backend calculates initial values:
   - `total_amount` = `amount`
   - `guide_income` = `amount * (1 - 0.25)`
3. Backend inserts the order.

### 4.2 Overtime Payment
1. User pays for overtime (`overtime_fee`).
2. Backend transaction updates `orders`:
   - `total_amount` = `total_amount` + `overtime_fee` (Note: `amount` remains unchanged)
   - `guide_income` = `guide_income` + `overtime_fee * (1 - 0.25)`
3. Payment record created.

### 4.3 Order Query
1. API returns `order` object including `totalAmount` and `guideIncome`.
2. Frontend displays `guideIncome` directly.
3. Frontend uses `totalAmount` to display the total cost of the order.

## 5. Migration Strategy
For existing orders:
- **Action**: Run a one-time SQL update.
- **Logic**: 
  ```sql
  UPDATE orders 
  SET 
    total_amount = amount,
    guide_income = ROUND(amount * 0.75) 
  WHERE total_amount = 0;
  ```
  *(Note: This assumes existing `amount` includes overtime if previously implemented that way. If `overtimeRecords` exists, we might need a more complex join update, but for MVP this is acceptable as a baseline.)*

## 6. Test Plan (Verification Strategy)

### 6.1 Unit/Integration Tests
| Case ID | Description | Expected Result |
| :--- | :--- | :--- |
| **T-01** | Create Standard Order (¥1000) | DB: `amount`=1000, `total_amount`=1000, `guide_income`=750. |
| **T-02** | Pay Overtime (¥200) | DB: `amount`=1000, `total_amount`=1200, `guide_income`=900 (750+150). |
| **T-03** | Frontend Display (Guide View) | Shows "本单收入 ¥900" (Red). |
| **T-04** | Frontend Display (User View) | Shows "实付金额 ¥1200". |

### 6.2 Manual Verification Steps (Run by Agent)
1. **Create Order**: Use `OrderService.create` (or mock) to generate a test order.
2. **Verify DB**: Check `guide_income` field value.
3. **Add Overtime**: Call `OrderService.createOvertime` then `OrderService.payOvertime`.
4. **Verify DB Again**: Check if `guide_income` increased correctly.
5. **API Check**: Call `GET /orders/:id` and ensure JSON response contains correct fields.
