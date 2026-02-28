# Phase 1 Review Decisions and Implementation Status (2026-02-27)

Purpose: durable reference for future fixes.  
Scope: business-critical flow risks in order/payment/refund/custom-order.

## Overall Verdict (Phase 1)

- Phase 1 core decisions are implemented.
- Remaining high-risk items: none in this phase.
- Deferred by decision: real payment gateway callback idempotency design.

## Problem List and Final Decision

### P1. Deprecated admin guide-assignment flow still existed in code

Decision:
- Remove V1-style assign/select-guide flow in V2.
- Keep only "create order with explicit `guideId`" model.

Implemented:
- Deleted assign endpoint usage and candidate/select-guide paths.
- Updated tests to assert deprecated endpoints are unavailable.

Key refs:
- `server/routes/admin.routes.ts`
- `server/routes/order.routes.ts`
- `server/controllers/admin.controller.ts`
- `server/controllers/order.controller.ts`
- `client/src/lib/api.ts`
- `client/src/pages/admin/OrderList.tsx`
- `tests/integration/test-guide-assignment.ts`

### P2. Wrong payment authorization boundary

Decision:
- Only order owner (`orders.userId`) can pay.
- Assigned guide cannot pay the order.

Implemented:
- Permission check tightened in order pay controller.

Key refs:
- `server/controllers/order.controller.ts`

### P3. Duplicate payment/overtime/refund under concurrency

Decision:
- Use CAS-style guarded state transition for MVP.
- Keep gateway transaction-id idempotency key for future real payment integration.

Implemented:
- Order pay: CAS transition before side effects.
- Overtime pay: CAS transition before side effects.
- Refund: deterministic duplicate behavior; no repeated side effects.

Key refs:
- `server/controllers/order.controller.ts`
- `server/services/order.service.ts`
- `scripts/test-idempotency-cas.ts`

### P4. Duplicate refund behavior was unclear

Decision:
- Repeated refund should return deterministic success semantics (`alreadyRefunded`), not re-execute refund logic.

Implemented:
- Added explicit handling for already-refunded state and stable response mapping.

Key refs:
- `server/services/order.service.ts`
- `server/controllers/order.controller.ts`

### P5. Custom-order and `guideId` data integrity risk

Decision:
- Custom order is admin/CS operational path.
- `guideId` must be validated; no `guideId=0` fallback.

Implemented:
- User-side custom creation disabled.
- Backend no longer relies on invalid fallback behavior.

Key refs:
- `server/controllers/order.controller.ts`
- `server/controllers/admin.controller.ts`
- `server/db/schema.ts`

### P6. Status literals should use constants for maintainability

Decision:
- Replace hardcoded status strings in critical service paths with `OrderStatus` constants.

Implemented:
- Refund critical path updated to constants.

Key refs:
- `server/services/order.service.ts`
- `shared/order-status.ts`

## Validation Record

- TypeScript server build passed:
  - `npm run build:server`
- CAS idempotency script passed (3 scenarios):
  - `npm run test:idempotency`
  - Scenarios: `payOrder`, `payOvertime`, `refund` parallel duplicates.

## Deferred Items (Explicitly Not in Current Batch)

- Real payment gateway callback replay/idempotency:
  - Use gateway transaction id / callback event id as idempotency key.
  - Add DB unique constraint and callback dedupe handling.
  - Add callback replay tests after gateway integration starts.

Reason:
- Current stage is mocked payment; CAS is accepted for MVP risk profile.
