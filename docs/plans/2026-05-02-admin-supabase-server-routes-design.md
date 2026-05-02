# Admin App: Move Supabase Calls to Server Routes

**Date**: 2026-05-02
**Status**: Design approved
**Branch**: `issue-with-user-approval-and-missing-supabase-cred`
**Urgency**: HIGH — admin user-approval page is broken in production

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
- Admin client code calls `getSupabaseClient()` from `'use client'` pages (broken)

## Decision: Pattern C (server routes + service_role)

| Rejected option | Why |
|---|---|
| Restore `NEXT_PUBLIC_` prefix | Re-opens the security incident |
| Anon key + admin RLS policies | Fights the established design (RLS migration assumes admin uses service_role) and adds a new policy surface to maintain for every admin operation |

**Pattern C** matches Supabase's recommended pattern for admin tooling: end users use anon key + RLS; admins go through a server that holds `service_role`. The two layers are complementary, not competing.

## Architecture

```
Browser (admin app, 'use client')
   │  fetch('/api/admin/...', headers: { Authorization: Bearer <Firebase ID token> })
   ▼
Next.js Route Handler (apps/admin/src/app/api/admin/**)
   │  1. requireAdmin(req) — verify Firebase ID token, check ADMIN_EMAILS
   │  2. getSupabaseClient() — service_role, server-only
   ▼
Supabase
```

### Auth model

- Admin app keeps Firebase Auth. Migrating admin to Supabase Auth is a separate, optional follow-up.
- Route handlers verify the Firebase ID token using `firebase-admin` (the same SDK Cloud Functions in `functions/src/shared/` already use).
- `ADMIN_EMAILS` env var (comma-separated) is the single source of truth. Both client-side route gate and server-side `requireAdmin` read it.
- Token transport: `Authorization: Bearer <Firebase ID token>`. Client retries once with `getIdToken(true)` on 401.

### Safety mechanism

`apps/admin/src/lib/server/supabase.ts` starts with `import 'server-only'`. Next.js fails the build if any client component imports it. This structurally prevents the original bug from recurring.

## File Layout

### New files

```
apps/admin/src/
├── lib/
│   ├── api-client.ts                # client-side authed fetch wrapper
│   └── server/
│       ├── supabase.ts              # service_role client (`import 'server-only'`)
│       ├── firebase-admin.ts        # firebase-admin SDK init
│       └── auth.ts                  # requireAdmin(req)
├── apis/
│   └── admin-api.ts                 # client wrappers calling /api/admin/*
└── app/
    └── api/
        └── admin/
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
            │   ├── approve/route.ts           # POST
            │   ├── reject/route.ts            # POST
            │   └── [id]/previous-cohort-posts/route.ts
            ├── posts/route.ts
            └── app-config/route.ts            # GET, POST
```

### Files to modify

- `apps/admin/src/app/admin/page.tsx` — read `NEXT_PUBLIC_ADMIN_EMAILS` env var, drop hardcoded set
- `apps/admin/src/app/admin/user-approval/page.tsx` — import from `admin-api`, drop `getSupabaseClient`
- `apps/admin/src/app/admin/boards/[boardId]/page.tsx` — same
- `apps/admin/src/hooks/useCreateUpcomingBoard.ts` — same

### Files to delete (Phase 3)

- `apps/admin/src/lib/supabase.ts`
- `apps/admin/src/apis/supabase-reads.ts`

## Route Catalog

| Method + Path | Replaces | Used by |
|---|---|---|
| `GET /api/admin/boards` | `fetchBoardsMapped` | user-approval, boards |
| `GET /api/admin/boards/[id]` | `fetchBoardMapped` | user-approval, boards/[id] |
| `GET /api/admin/boards/last` | `fetchLastBoard` | useCreateUpcomingBoard |
| `POST /api/admin/boards` | board insert | settings |
| `GET /api/admin/boards/[id]/users` | `fetchBoardUsers` | boards/[id] |
| `GET /api/admin/boards/[id]/waiting-users` | `fetchWaitingUserIds` | user-approval |
| `GET /api/admin/users` | `fetchAllUsers` | users |
| `GET /api/admin/users/search?q=...` | `searchUsers` | users |
| `POST /api/admin/users/by-ids` | `fetchUsersByIds` | various |
| `POST /api/admin/users/approve` | approve mutation | user-approval |
| `POST /api/admin/users/reject` | reject mutation | user-approval |
| `GET /api/admin/users/[id]/previous-cohort-posts?cohort=N` | `fetchPreviousCohortPostCount` | user-approval |
| `GET /api/admin/posts?boardId=X&range=week\|all` | `fetchPosts` | posts |
| `GET /api/admin/app-config` | `fetchAppConfig` | settings |
| `POST /api/admin/app-config` | `updateAppConfig` | settings |

## Required Environment Variables

Vercel (production + preview):

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL (server-only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |
| `ADMIN_EMAILS` | Comma-separated allowlist (server-side check) |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Same allowlist (client-side route gate) |
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK init |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK init |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK init (newlines as `\n`) |

`NEXT_PUBLIC_SUPABASE_URL` becomes unused in admin app. Drop it in Phase 3.

## Phased Rollout

**Phase 0 — Foundations.** Add `firebase-admin` dependency. Create `lib/server/{supabase,firebase-admin,auth}.ts` and `lib/api-client.ts`. Configure Vercel env vars. No user-facing change.

**Phase 1 — Vertical slice: user-approval.** Create the 6 routes user-approval needs. Add functions to `admin-api.ts`. Refactor `user-approval/page.tsx` to use them. Test against local Supabase, deploy. **Production unblocked.**

**Phase 2 — Migrate remaining pages.** boards, users, posts, settings. One PR per page.

**Phase 3 — Cleanup.** Delete `lib/supabase.ts` and `apis/supabase-reads.ts`. Replace hardcoded `ADMIN_EMAIL` set with env-based read. Drop `NEXT_PUBLIC_SUPABASE_URL` from admin Vercel env. Add unit test for `requireAdmin`.

Phase 3 is not optional — the old `lib/supabase.ts` must be deleted to lock in the `server-only` boundary.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| `FIREBASE_PRIVATE_KEY` newline escaping | `replace(/\\n/g, '\n')` in `firebase-admin.ts` init |
| Firebase Admin SDK cold-start | Cache initialized app at module scope (existing pattern in `functions/src/shared/`) |
| ID token expires mid-session (1h) | `api-client.ts` retries once with `getIdToken(true)` on 401 |
| Local dev env vars | Already loaded from monorepo root via `loadEnvConfig` in `next.config.ts` |
| CSRF | Header-based `Authorization: Bearer` — browsers don't auto-attach cross-origin headers; not a concern |
| No rate limiting | Defer (admin = 2 trusted users); add `@upstash/ratelimit` later if needed |

## Verification — definition of done

- [ ] `https://admin.dailywritingfriends.com/admin/user-approval` loads the boards list
- [ ] Approve and reject mutations succeed
- [ ] `grep -r 'SUPABASE_SERVICE_ROLE_KEY' apps/admin/src/` returns only `lib/server/` files
- [ ] Production browser DevTools → Sources: search bundle for the service role key string → not present
- [ ] Build fails when a `'use client'` file imports `lib/server/supabase.ts` (regression test)

## Out of Scope

- Migrating admin app from Firebase Auth to Supabase Auth (separate task)
- Admin RLS policies on Supabase tables (rejected; service_role is the design)
- Rate limiting (defer until needed)
- Admin role granularity beyond the email allowlist (defer)
