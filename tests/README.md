# Tests Directory Guide

## Active Integration Regression
- `tests/integration/test-core-api.ts`
- `tests/integration/test-booking-flow.ts`
- `tests/integration/test-payment-flow.ts`
- `tests/integration/test-lbs-flow.ts`
- `tests/integration/test-admin-flow.ts`
- `tests/integration/test-guide-assignment.ts`

Run:
- `npm run test:e2e`
- `npm run test:api` (core API only)

## Archived / Historical
- `tests/archive/*`

These files are kept for reference only and are not part of default regression.

## UI E2E
- `tests/e2e/*.spec.ts`
- Run with `npm run test:e2e:ui`
