# Scripts Guide

This directory is mixed-purpose. Use the categories below for handover.

## Core (keep in handover test path)
- `test-idempotency-cas.ts`

## Manual Test Scripts (optional appendix)
- `test-admin-guide-audit.ts`
- `test-admin-stats.ts`
- `test-attachment-system.ts`
- `test-audit-logs.ts`
- `test-auto-cancel.ts`
- `test-auto-settle.ts`
- `test-ban-flow.ts`
- `test-checkin-flow.ts`
- `test-custom-order-creation.ts`
- `test-overtime-flow.ts`
- `test-rbac-flow.ts`
- `test-refund-flow.ts`
- `test-system-config.ts`
- `test-user-list.ts`
- `test-user-refund-v2.1.ts`
- `test-wallet-flow.ts`
- `test-withdraw-audit.ts`

## Seed / Tool / Debug (do not treat as acceptance tests)
- `seed-*.ts`
- `tool-*.ts`
- `check-db-status.ts`
- `debug-guide-photos.ts`
- `fix-test-data.ts`
- `inspect-attachment-keys.ts`
- `manual-sms-send.ts`
- `verify-admin-api.ts`
- `verify-admin-user-v2.1.ts`
- `verify-guide-v2.ts`
- `shared/*`

## Handover Recommendation
- Core handover should prioritize:
  - `tests/integration/*` active regression
  - `tests/e2e/*` UI E2E
  - `scripts/test-idempotency-cas.ts`
- Include remaining `scripts/*` only as optional operational utilities.
