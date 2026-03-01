# Gepei Backend

TypeScript + Express + MySQL backend (with bundled frontend build output support).

## Runtime Requirements
- Node.js >= 20
- MySQL 8.0+

## Quick Start
```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Server defaults:
- API base: `/api/v1/*`
- Health: `GET /health`

## Build and Start
```bash
npm run build
npm start
```

## Required Environment
- `DATABASE_URL`
- `JWT_SECRET` (required at server startup)

Optional:
- `JWT_EXPIRES_IN` (default `7d`)
- `PORT` (default `3000`)
- `NODE_ENV` (default `development`)

For deployment details, see:
- `DEPLOY.md`
- `docs/DEPLOYMENT_CHECKLIST.md`

## Project Structure (Current)
```text
server/        # backend runtime (app, routes, controllers, services, db, scheduler)
client/        # frontend source
shared/        # shared constants/types
drizzle/       # migrations/meta
scripts/       # manual test/seed/tool scripts (see scripts/README.md)
tests/         # active/archived tests (see tests/README.md)
docs/          # active docs + archive (see docs/README.md)
```

## Test Entry Points
Core:
- `npm run test:e2e` (integration script bundle)
- `npm run test:e2e:ui` (Playwright)
- `npm run test:api` (core API integration script)
- `npm run test:idempotency`

Test organization:
- `tests/integration/*` = active backend regression
- `tests/e2e/*` = UI E2E
- `tests/archive/*` = historical (not default pipeline)

## Handover Entry
- `HANDOVER_INDEX.md`
