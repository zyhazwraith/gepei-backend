# Handover Index

This index defines the recommended reading and delivery order for project handover.

## 1) Root Files (Read First)
1. `README.md`
2. `package.json`
3. `codex.md`
4. Build/config files (`tsconfig*.json`, `vite.config.ts`, `drizzle.config.ts`)

## 2) Deployment and Runtime
1. `DEPLOY.md`
2. `docs/DEPLOYMENT_CHECKLIST.md`
3. `server/server.ts`
4. `server/app.ts`

## 3) Review Baseline and Findings
1. `docs/review_baseline.md`
2. `docs/review_phase1_discussion_2026-02-27.md`
3. `docs/review_phase2_scan_2026-02-28.md`
4. `docs/review_phase3_scan_2026-02-28.md`

## 4) Backend Runtime (`server/`)
- Keep all current runtime files (controllers, routes, services, models, middleware, scheduler, db, utils).
- No deletion unless proven unreferenced by import graph + build verification.

## 5) Frontend Runtime (`client/`)
- Keep current runtime files.
- Future cleanup only for proven dead imports/helpers.

## 6) Tests (`tests/`)
1. `tests/README.md` (entry guide)
2. `tests/integration/*` (active backend regression)
3. `tests/e2e/*` (UI E2E)
4. `tests/archive/*` (historical; not in default pipeline)

## 7) Scripts (`scripts/`)
1. `scripts/README.md` (classification)
2. Core: `scripts/test-idempotency-cas.ts`
3. Manual test appendix: `scripts/test-*.ts` (except core above)
4. Ops/debug appendix: `scripts/seed-*.ts`, `scripts/tool-*.ts`, `scripts/debug-*`, `scripts/manual-*`, `scripts/shared/*`

## 8) Docs (`docs/`)
1. Active operations/review docs:
   - `docs/DEPLOYMENT_CHECKLIST.md`
   - `docs/all-test-cases.md`
   - `docs/review_*`
2. Historical docs:
   - `docs/archive/**` (reference only, do not load by default)

## 9) Deferred Backlog (Not in this handover cleanup batch)
1. Auth throttling + API abuse logging
2. Upload private-access redesign
3. Multi-instance scheduler hardening (leader/lock)
4. Real payment callback idempotency migration
