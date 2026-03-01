# Phase 3 Scan Report (Security and Permissions)

Updated: 2026-02-28  
Scope: exploitable auth/authz/data exposure risks (`P0/P1` focus).  
Note: updated with implementation status after discussion decisions.

## Implementation Status

- Finding 1: `Implemented` (removed JWT fallback secret, require env).
- Finding 2: `Implemented` (usage/context/slot validation + safe path resolve guard).
- Finding 3: `Implemented` (`check_in` now enforces guide-order ownership unless admin).
- Finding 4: `Deferred by decision` (current stage accepts public check-in image exposure risk).
- Finding 5: `Deferred by decision` (to be planned with low-cost throttling/logging phase).

## Finding 1

- Severity: `P0`
- Title: Predictable fallback JWT secret enables token forgery / account impersonation
- Impact:
  - If `JWT_SECRET` is missing/misconfigured in production, attacker can forge valid tokens.
  - Because auth trusts token `id` to load user, forged token can impersonate any account (including admin if user id known/guessed).
- Evidence:
  - Hardcoded fallback secret: `server/utils/jwt.ts:5`
  - Auth uses token payload `id` to load user: `server/middleware/auth.middleware.ts:32`, `server/middleware/auth.middleware.ts:35`
- Confidence: `High`
- Fix:
  - Remove fallback secret completely.
  - Fail fast on startup if `JWT_SECRET` is missing.
  - Rotate secret immediately in all environments where fallback may have been used.

## Finding 2

- Severity: `P0`
- Title: Attachment upload allows path manipulation and cross-resource overwrite (IDOR + file path risk)
- Impact:
  - User-controlled `contextId/slot` is used in file path generation without strict validation.
  - Attackers can tamper with attachment keys and overwrite files for other resources (including check-in evidence).
  - This can corrupt evidence and potentially write outside intended path if crafted values are accepted.
- Evidence:
  - Raw input from body forwarded: `server/controllers/attachment.controller.ts:9`, `server/controllers/attachment.controller.ts:60`
  - Path built from unsanitized `contextId/slot`: `server/services/attachment.service.ts:22`, `server/services/attachment.service.ts:30`, `server/services/attachment.service.ts:38`, `server/services/attachment.service.ts:82`
  - Write path directly joined and written: `server/services/attachment.service.ts:83`, `server/services/attachment.service.ts:111`
  - Upsert by key overwrites existing logical object: `server/services/attachment.service.ts:129`, `server/services/attachment.service.ts:137`
- Confidence: `High`
- Fix:
  - Enforce strict schema per `usage`:
    - `contextId` numeric only where applicable.
    - `slot` enum-limited (`start|end`, `1..5`, etc.).
  - Resolve and verify final path stays within upload root (`startsWith(UPLOAD_ROOT)` after normalize/resolve).
  - For `check_in`, enforce ownership binding (only assigned guide/admin for target order).
  - Consider generating server-side opaque keys rather than deterministic user-influenced keys.

## Finding 3

- Severity: `P1`
- Title: Check-in upload permission check is incomplete (non-guide users can still pass branch)
- Impact:
  - Current branch for `usage=check_in` does not reject unauthorized users.
  - Combined with weak key control, this increases tampering surface for check-in artifacts.
- Evidence:
  - Non-admin/non-guide branch has no `throw`/deny: `server/controllers/attachment.controller.ts:46`, `server/controllers/attachment.controller.ts:49`
- Confidence: `High`
- Fix:
  - Explicitly `throw ForbiddenError` for non-admin and non-guide users.
  - Additionally verify the guide is assigned to the referenced order before allowing upload.

## Finding 4

- Severity: `P1`
- Title: Uploaded files are publicly exposed via static `/uploads` without access control
- Impact:
  - Sensitive business photos (e.g., check-in evidence) are retrievable by direct URL if guessed/leaked.
  - Deterministic key patterns make enumeration easier.
- Evidence:
  - Public static mount: `server/app.ts:46`
  - Deterministic check-in key format: `server/services/attachment.service.ts:38`
- Confidence: `High`
- Fix:
  - Move sensitive file access behind authenticated API with ownership/role checks.
  - Use signed URLs (short TTL) for private assets.
  - Keep only explicitly public assets (if any) on direct static path.

## Finding 5

- Severity: `P1`
- Title: Auth endpoints have no visible rate-limit/throttle controls
- Impact:
  - Increased brute-force/abuse risk on login and verification flows.
  - Can cause account takeover attempts and SMS cost amplification.
- Evidence:
  - Auth routes mounted without rate-limit middleware: `server/routes/auth.routes.ts:9`, `server/routes/auth.routes.ts:12`, `server/routes/auth.routes.ts:15`, `server/routes/auth.routes.ts:18`
  - Verification service has no local attempt throttling: `server/services/verification.service.ts:4`, `server/services/verification.service.ts:13`
  - App middleware list has no rate-limiter layer: `server/app.ts:27`, `server/app.ts:58`
- Confidence: `Medium`
- Fix:
  - Add per-IP and per-phone throttling for verification-code and login endpoints.
  - Add lockout/backoff policy for repeated failed verification attempts.
  - Add abuse metrics/alerts.

## Phase 3 Gate (Current)

- Ship gate: `GO` for current scope after Findings 1/2/3 implementation.
- Deferred risk acceptance:
  1. Finding 4 kept as accepted risk for current stage.
  2. Finding 5 planned as next security hardening step.
