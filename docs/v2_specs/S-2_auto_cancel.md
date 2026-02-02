# Feature Spec: Auto Cancel Orders (S-2)

## 1. Context & User Story
*   **Goal**: Release inventory/schedule slots occupied by unpaid orders.
*   **Rule**: Orders must be paid within **60 minutes** of creation.
*   **System Logic**: Actual cancellation happens at **75 minutes** (15m grace period) to accommodate potential clock skews and improve UX.

## 2. Technical Design
### 2.1 Database
*   **Target Table**: `orders`
*   **ORM Logic (Drizzle)**:
    ```typescript
    import { lt, eq, and } from 'drizzle-orm';
    
    // 1. Calculate Deadline
    const GRACE_PERIOD_MINUTES = 75;
    const deadline = new Date(Date.now() - GRACE_PERIOD_MINUTES * 60 * 1000);
    
    // 2. Update Status
    await db.update(orders)
      .set({ 
        status: 'cancelled', 
        updatedAt: new Date() 
      })
      .where(and(
        eq(orders.status, 'pending'),
        lt(orders.createdAt, deadline)
      ));
    ```

### 2.2 Scheduler
*   **Library**: `node-cron`
*   **Cron Expression**: `*/5 * * * *` (Every 5 minutes)
*   **Module**: `server/jobs/auto-cancel.job.ts`
*   **Flow**:
    1.  Job triggers every 5 mins.
    2.  Call `OrderService.cancelExpiredOrders()`.
    3.  Service performs the update query.
    4.  Log the result (if possible) or just execution status.

## 3. Implementation Checklist
*   [ ] Install `node-cron` & types.
*   [ ] Implement `OrderService.cancelExpiredOrders()`.
*   [ ] Create `server/jobs/scheduler.ts` (Registry).
*   [ ] Register scheduler in `server/server.ts`.
*   [ ] Verify with `scripts/test-auto-cancel.ts`.
