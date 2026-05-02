# Admin App: Move Supabase Calls to Server Routes

**Date**: 2026-05-02
**Status**: Design approved (rev. 2 — incorporates parallel review feedback)
**Branch**: `issue-with-user-approval-and-missing-supabase-cred`
**Urgency**: HIGH — every Supabase-dependent admin page is broken in production

---

## Motivation

The admin app's user-approval page throws `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` in production. Root cause: a `'use client'` component calls `getSupabaseClient()`, which reads `process.env.SUPABASE_SERVICE_ROLE_KEY`. Next.js never inlines non-`NEXT_PUBLIC_` env vars into the client bundle, so the key is `undefined` in the browser by design.

Restoring the `NEXT_PUBLIC_` prefix would re-introduce the security hole that commit `8c92bb8f` closed (April 2026 Vercel incident — service role key leaked to every browser visitor).

This design moves all admin Supabase calls behind Next.js Route Handlers. The service role key never leaves the server.

## Current State

- Admin app: Next.js 15, deployed at `admin.dailywritingfriends.com`
- Admin auth: Firebase Auth + hardcoded email allowlist in `apps/admin/src/app/admin/page.tsx:20`
- Web app: Supabase Auth, RLS enabled (migration `20260301000000_reenable_rls.sql`)
- The RLS migration explicitly excludes admin operations: comments document that `boards` and `board_waiting_users` writes go through `service_role` from the admin app
- **Production scope of breakage:** every page that imports `supabase-reads` or `getSupabaseClient` throws on render. Affected pages: dashboard landing (`admin/page.tsx`), user-approval, boards list, board detail, posts, users, settings (via `useCreateUpcomingBoard`, `useRemoteConfig`). The first page an admin sees after login is broken.

## Decision: Pattern C (server routes + service_role)

| Rejected option | Why |
|---|---|
| Restore `NEXT_PUBLIC_` prefix | Re-opens the security incident |
| Anon key + admin RLS policies | Fights the established design (RLS migration assumes admin uses service_role) and adds a new policy surface to maintain for every admin operation |

Pattern C matches Supabase's recommended pattern for admin tooling: end users use anon key + RLS; admins go through a server that holds `service_role`. The two layers are complementary, not competing.

## Decision Record: Defer Supabase Auth migration for admin app

The admin app stays on Firebase Auth. Migrating to Supabase Auth (so the admin app uses the same auth as the web app) is **deferred, not rejected**.

**Cost of deferring:**

- The admin app pays for a small JWT verification layer (`jose` library, ~30 lines) that becomes throwaway code when the migration eventually happens.
- Admin sign-in UX stays separate from web sign-in UX.

**Cost of doing it now:**

- Wire up Supabase Auth OAuth flow in admin app (Google provider config, redirect URI, session handling).
- Remap admin user records — admins already have web app accounts (Supabase UUID); confirm 1:1 mapping or pre-create.
- Update the broken-page fix (this design) to coordinate with auth migration.

**Trigger to revisit:** when admin app gains a third or fourth admin, when admin needs to share session state with the web app, or when this design's JWT verification needs to add features (refresh handling, custom claims, etc.). Until then, the throwaway cost is a few dozen lines.

## Architecture

```
Browser (admin app, 'use client')
   │  fetch('/api/admin/...', headers: { Authorization: Bearer <Firebase ID token> })
   ▼
Next.js Route Handler (apps/admin/src/app/api/admin/**)
   │  1. requireAdmin(req)
   │     - verify Firebase ID token signature against Google's JWKS (via `jose`)
   │     - reject if email claim is empty/null
   │     - reject if email not in ADMIN_EMAILS
   │  2. log audit event (timestamp, admin email, action, target) for mutations
   │  3. getSupabaseClient() — service_role, server-only
   ▼
Supabase
```

### Auth model

- **Token verification with `jose`, not `firebase-admin`.** Verify Firebase ID tokens by fetching Google's JWKS (`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`) and validating signature + issuer + audience claims. This avoids the `firebase-admin` dependency, removes 3 env vars (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`), eliminates cold-start cost, and keeps the deferred Supabase Auth migration cheap.
- **`ADMIN_EMAILS` env var (comma-separated)** is the single source of truth, server-side only. The client does not receive the allowlist.
- **Client-side admin check** uses a lightweight `GET /api/admin/me` endpoint that returns `{ isAdmin: boolean }`. Replaces the hardcoded set in `app/admin/page.tsx`. Avoids leaking admin identities to every visitor (which would enable targeted phishing of the very accounts whose stolen tokens give full access).
- **Token transport:** `Authorization: Bearer <Firebase ID token>`. Client retries once with `getIdToken(true)` on 401.
- **Fail closed:** if `ADMIN_EMAILS` is missing or parses to an empty set, `requireAdmin` throws at module load — route handlers won't accept any request. Empty/null email claims are rejected before the allowlist check.

### Audit logging

Every mutation route (POST/PATCH/DELETE) logs `{ timestamp, adminEmail, action, target }` via `console.log` (Vercel collects). Without this, service_role writes have zero attribution because Supabase sees no `auth.uid()`.

### Rate limiting

Mutations apply per-admin-email rate limit (e.g., 60 req/min) via `@upstash/ratelimit`. Reads are unlimited. Without this, a stolen Firebase ID token grants 1h of unlimited service_role access across 16 endpoints — the realistic blast radius is full DB exfiltration.

### Safety mechanism

`apps/admin/src/lib/server/supabase.ts` starts with `import 'server-only'`. Next.js fails the build if any client component imports it. This structurally prevents the original bug from recurring.

**Plus an ESLint rule from Phase 1 onwards:** ban `from '@/lib/supabase'` (the old, deleted-in-Phase-3 path) in any file. Prevents a developer from re-introducing the broken pattern between Phase 1 and Phase 3.

## File Layout

### New files

```
apps/admin/src/
├── lib/
│   ├── api-client.ts                # client-side authed fetch wrapper
│   └── server/
│       ├── supabase.ts              # service_role client (`import 'server-only'`)
│       ├── verify-token.ts          # Firebase ID token verification via `jose`
│       ├── auth.ts                  # requireAdmin(req) — fails closed
│       └── rate-limit.ts            # per-admin-email rate limiter
├── apis/
│   └── admin-api.ts                 # client wrappers calling /api/admin/*
├── types/
│   └── admin-api.ts                 # SHARED request/response types (client + server import)
└── app/
    └── api/
        └── admin/
            ├── me/route.ts                    # GET — { isAdmin: boolean }
            ├── boards/
            │   ├── route.ts                   # GET, POST
            │   ├── last/route.ts              # GET
            │   └── [id]/
            │       ├── route.ts               # GET
            │       ├── users/route.ts         # GET
            │       └── waiting-users/route.ts # GET
            ├── users/
            │   ├── route.ts                   # GET
            │   ├── search/route.ts            # GET
            │   ├── by-ids/route.ts            # POST
            │   ├── approve/route.ts           # POST (audited, rate-limited)
            │   ├── reject/route.ts            # POST (audited, rate-limited)
            │   └── [id]/previous-cohort-posts/route.ts
            ├── posts/route.ts
            └── app-config/route.ts            # GET, POST (POST audited, rate-limited)
```

### Files to modify

- `apps/admin/src/app/admin/page.tsx` — replace hardcoded `ADMIN_EMAIL` set with a `GET /api/admin/me` call (via React Query)
- `apps/admin/src/app/admin/user-approval/page.tsx` — import from `admin-api`, drop `getSupabaseClient`
- `apps/admin/src/app/admin/boards/[boardId]/page.tsx` — same
- `apps/admin/src/app/admin/users/page.tsx` — same
- `apps/admin/src/app/admin/posts/page.tsx` — same
- `apps/admin/src/app/admin/boards/page.tsx` — same
- `apps/admin/src/hooks/useCreateUpcomingBoard.ts` — same
- `apps/admin/src/hooks/useRemoteConfig.ts` — same
- ESLint config — ban import from `@/lib/supabase`

### Files to delete (Phase 3)

- `apps/admin/src/lib/supabase.ts`
- `apps/admin/src/apis/supabase-reads.ts`

## Route Catalog

| Method + Path | Replaces | Used by |
|---|---|---|
| `GET /api/admin/me` | hardcoded `ADMIN_EMAIL` set | dashboard route gate |
| `GET /api/admin/boards` | `fetchBoardsMapped` | user-approval, boards, posts |
| `GET /api/admin/boards/[id]` | `fetchBoardMapped` | user-approval, boards/[id] |
| `GET /api/admin/boards/last` | `fetchLastBoard` | useCreateUpcomingBoard |
| `POST /api/admin/boards` (audited) | board insert | settings |
| `GET /api/admin/boards/[id]/users` | `fetchBoardUsers` | boards/[id] |
| `GET /api/admin/boards/[id]/waiting-users` | `fetchWaitingUserIds` | user-approval |
| `GET /api/admin/users` | `fetchAllUsers` | users |
| `GET /api/admin/users/search?q=...` | `searchUsers` | users |
| `POST /api/admin/users/by-ids` | `fetchUsersByIds` | various |
| `POST /api/admin/users/approve` (audited) | approve mutation | user-approval |
| `POST /api/admin/users/reject` (audited) | reject mutation | user-approval |
| `GET /api/admin/users/[id]/previous-cohort-posts?cohort=N` | `fetchPreviousCohortPostCount` | user-approval |
| `GET /api/admin/posts?boardId=X&range=week\|all` | `fetchPosts` | posts |
| `GET /api/admin/app-config` | `fetchAppConfig` | dashboard, settings, boards |
| `POST /api/admin/app-config` (audited) | `updateAppConfig` | settings |

## Required Environment Variables

Vercel (production + preview):

| Variable | Purpose | Scope |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | server-only |
| `ADMIN_EMAILS` | Comma-separated allowlist | server-only |
| `FIREBASE_PROJECT_ID` | Token issuer/audience claim verification | server-only |
| `UPSTASH_REDIS_REST_URL` | Rate limiter backend | server-only |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiter backend | server-only |

`NEXT_PUBLIC_SUPABASE_URL` becomes unused in admin app. Drop it in Phase 3.

`FIREBASE_PROJECT_ID` is used to verify the `aud` and `iss` claims of the Firebase ID token (`iss = "https://securetoken.google.com/<project-id>"`, `aud = "<project-id>"`). It is the **only** Firebase server env var needed — no private key, no client email.

## Phased Rollout

**Phase 0 — Foundations (no user-facing change).**
- Add `jose` and `@upstash/ratelimit` dependencies
- Create `lib/server/{supabase,verify-token,auth,rate-limit}.ts`
- Create `lib/api-client.ts`
- Create `types/admin-api.ts` with shared request/response types
- Add ESLint rule banning import of `@/lib/supabase`
- Configure all Vercel env vars

**Phase 1 — Restore production (covers ALL currently-broken pages).**
- Create routes for: `/me`, all GET reads (boards, board, board-users, waiting-users, all-users, search, users-by-ids, posts, app-config, previous-cohort-posts, boards/last)
- Create mutations needed by user-approval: approve, reject (audited + rate-limited)
- Refactor every page that imports `supabase-reads` or `getSupabaseClient` for reads:
  - `admin/page.tsx` (uses `/api/admin/me`)
  - `user-approval/page.tsx` (full migration including mutations)
  - `boards/page.tsx`, `boards/[boardId]/page.tsx`, `users/page.tsx`, `posts/page.tsx`
  - `useRemoteConfig.ts`
- Boards/[boardId] mutations and `useCreateUpcomingBoard` mutation defer to Phase 2 — those features become temporarily read-only, **but pages render**
- Test against local Supabase, deploy
- **Production: every read works; user-approval mutations work; board/config writes are temporarily disabled**

**Phase 2 — Migrate remaining mutations.**
- `POST /api/admin/boards`, `POST /api/admin/app-config`, `useCreateUpcomingBoard` migration
- Re-enable disabled board/settings write UI

**Phase 3 — Cleanup (security boundary).**
- Delete `lib/supabase.ts` and `apis/supabase-reads.ts`
- Drop `NEXT_PUBLIC_SUPABASE_URL` from admin Vercel env
- Add unit tests: `requireAdmin` (token validation, allowlist, fail-closed semantics)

Phase 3 is not optional. The old `lib/supabase.ts` must be deleted to lock in the `server-only` boundary. The ESLint rule from Phase 0 prevents accidental re-imports during the interim.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `requireAdmin` fails open on misconfiguration | Module-level startup check: throw if `ADMIN_EMAILS` parses to empty set; reject empty/null email claims explicitly |
| ID token expires mid-session (1h) | `api-client.ts` retries once with `getIdToken(true)` on 401 |
| Stolen ID token grants 1h of full service_role access | Per-admin-email rate limit + audit log identifies abuse + manual revoke (rotate `ADMIN_EMAILS`) is a fast killswitch |
| Local dev env vars | Already loaded from monorepo root via `loadEnvConfig` in `next.config.ts` |
| CSRF | Header-based `Authorization: Bearer` — browsers don't auto-attach cross-origin headers; not a concern |
| Client/server type drift across 16 routes | `types/admin-api.ts` is the single source of truth; both sides import |
| Service_role action with no `auth.uid()` attribution in DB | Mandatory audit log per mutation route includes verified admin email |
| Old broken `lib/supabase.ts` imported between Phase 1 and Phase 3 | ESLint rule blocks the import path from Phase 0 |
| JWKS fetch latency on cold instance | `jose` caches JWKS; cache is a module-level singleton; first request pays one fetch (~50ms), subsequent share it |

## Verification — definition of done

**Functional:**
- [ ] `https://admin.dailywritingfriends.com/admin` loads dashboard (no error)
- [ ] `/admin/user-approval` loads boards list and waiting users
- [ ] Approve and reject mutations succeed
- [ ] All other admin pages render without error (read-only for board/config writes is acceptable until Phase 2)

**Security boundary:**
- [ ] `grep -r 'SUPABASE_SERVICE_ROLE_KEY' apps/admin/src/` returns only `lib/server/` files
- [ ] `grep -rn "from '@/lib/supabase'" apps/admin/src/` returns nothing (Phase 3) — ESLint enforces this earlier
- [ ] Production browser DevTools → Sources: search bundle for the service role key string → not present
- [ ] Search bundle for any admin email → not present
- [ ] Build fails when a `'use client'` file imports `lib/server/supabase.ts` (regression test)

**Negative auth tests** (run before deploy):
- [ ] `curl /api/admin/boards` (no Authorization header) → 401
- [ ] `curl -H "Authorization: Bearer <valid-non-admin-firebase-token>" /api/admin/boards` → 403
- [ ] `curl -H "Authorization: Bearer <expired-token>" /api/admin/boards` → 401
- [ ] `curl -H "Authorization: Bearer garbage" /api/admin/boards` → 401
- [ ] With `ADMIN_EMAILS=""` set, route handler import throws at boot (verified in CI)

**Operational:**
- [ ] Audit log entries appear in Vercel logs for approve/reject/board-create/app-config-update
- [ ] Rate limit returns 429 after exceeding threshold (manual probe)

## Out of Scope

- Migrating admin app from Firebase Auth to Supabase Auth (deferred — see Decision Record above)
- Admin RLS policies on Supabase tables (rejected; service_role is the design)
- Multi-role admin (super_admin / moderator / read-only) — single allowlist is sufficient for current 2-user scale
- Token revocation shorter than Firebase's 1h ID token lifetime (Firebase limitation; rate limiting + allowlist rotation are the compensating controls)
