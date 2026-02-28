# Phase 2 Scan Report (Data Correctness and Concurrency)

Updated: 2026-02-28  
Scope: high-impact production risks only (`P0/P1` first).

## Implementation Status

- Finding 1: `Implemented` (CAS settle transition added in scheduler transaction).
- Finding 2: `Implemented` (check-in transition switched to CAS in transaction).
- Finding 3: `Implemented` (overtime end-time update changed to DB-current-value SQL expression).
- Finding 4: `Deferred` (real payment integration stage).

## Finding 1

- Severity: `P0`
- Title: Auto-settle can double-credit guide income under concurrent job execution
- Impact:
  - Same order can be settled more than once.
  - Guide balance may be overpaid, and duplicate wallet income logs may be written.
  - This is direct financial inconsistency.
- Evidence:
  - Scheduler runs in-process on server start: `server/server.ts:35`
  - CAS settle transition now enforced before side effects: `server/scheduler/settle.job.ts:46`, `server/scheduler/settle.job.ts:57`
  - Balance credit and wallet log execute only after CAS success: `server/scheduler/settle.job.ts:67`, `server/scheduler/settle.job.ts:76`
- Confidence: `High`
- Fix:
  - Change settle to atomic CAS transition:
    - `update orders set status='completed' where id=? and status='service_ended'`
    - continue credit/log only if `affectedRows===1`.
  - Add idempotency guard for settlement side effect:
    - either unique settlement table keyed by `order_id`,
    - or unique index preventing duplicate income log per `(user_id, type, related_type, related_id)` for `income/order`.
  - For multi-instance deployment, ensure only one scheduler leader runs (or use DB/Redis distributed lock).
- Current state:
  - CAS transition implemented in settle transaction.
  - Remaining hardening item: multi-instance scheduler leader lock.

## Finding 2

- Severity: `P1`
- Title: Check-in transition is non-atomic and can create duplicate start/end records
- Impact:
  - Concurrent duplicate requests can both pass pre-check and both write `check_in_records`.
  - Leads to timeline corruption (multiple starts/ends) and inconsistent service lifecycle.
- Evidence:
  - CAS transition uses expected previous status: `server/services/order.service.ts:203`, `server/services/order.service.ts:216`, `server/services/order.service.ts:220`
  - Check-in record is inserted only after CAS success: `server/services/order.service.ts:223`, `server/services/order.service.ts:228`
- Confidence: `High`
- Fix:
  - Move status read/check fully inside transaction.
  - Use CAS update by expected previous status:
    - `waiting_service -> in_service` for start
    - `in_service -> service_ended` for end
  - Insert check-in record only after CAS succeeds.
  - Add DB-level uniqueness on `(order_id, type)` in `check_in_records` as hard guard.
- Current state:
  - CAS transition and insert ordering implemented.
  - Remaining hardening item: DB unique constraint `(order_id, type)`.

## Finding 3

- Severity: `P1`
- Title: Overtime concurrent payments can lose `serviceEndTime` extension
- Impact:
  - Monetary totals (`totalAmount`, `guideIncome`, `totalDuration`) are incremented, but `serviceEndTime` can be overwritten by stale value.
  - Order may end earlier than paid duration, causing settlement/timing disputes.
- Evidence:
  - Overtime CAS remains in place: `server/services/order.service.ts:306`, `server/services/order.service.ts:313`
  - `serviceEndTime` is now computed from current DB row in SQL expression (no stale absolute overwrite): `server/services/order.service.ts:327`, `server/services/order.service.ts:331`
- Confidence: `High`
- Fix:
  - Re-read and lock order row inside transaction (`SELECT ... FOR UPDATE`) before computing `serviceEndTime`, or
  - Compute `serviceEndTime` directly in SQL from current DB value in one statement.
- Current state:
  - Implemented using SQL expression based on current DB `serviceEndTime`.

## Finding 4

- Severity: `P2`
- Title: Refund calls external provider inside DB transaction (future real-payment risk)
- Impact:
  - With real gateway integration, long transaction and external side effect coupling can cause lock contention or local/remote state divergence.
- Evidence:
  - External refund call occurs inside transaction: `server/services/order.service.ts:111`
  - Local order status is updated before external call: `server/services/order.service.ts:90`
- Confidence: `Medium` (current provider is mock)
- Fix:
  - For real payment phase, move to two-step idempotent flow (mark pending refund -> call gateway -> finalize by callback/job with idempotency key).

## Phase 2 Gate (Current)

- Ship gate for Phase 2: `GO` for current single-instance MVP runtime after implemented fixes.
- Remaining release caveat:
  - If deploying multiple backend instances, add scheduler leader lock before production scale-out.
- Priority order:
  1. Scheduler leader lock (multi-instance hardening)
  2. `check_in_records(order_id, type)` unique DB constraint
  3. Keep Finding 4 in integration backlog (real payment phase)
