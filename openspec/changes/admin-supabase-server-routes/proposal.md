## Why

Every Supabase-dependent admin page is broken in production. A `'use client'` component calls `getSupabaseClient()`, which reads `process.env.SUPABASE_SERVICE_ROLE_KEY` — a non-`NEXT_PUBLIC_` env var that Next.js never inlines into the browser bundle. Restoring the `NEXT_PUBLIC_` prefix would re-introduce the April 2026 incident where the service role key leaked to every visitor (closed by commit `8c92bb8f`). The first page an admin sees after login is broken, so this is urgent.

## What Changes

- **BREAKING**: Move all admin Supabase calls behind Next.js Route Handlers under `apps/admin/src/app/api/admin/**`. The service role key never leaves the server.
- Add server-only modules: `lib/server/supabase.ts` (with `import 'server-only'`), `lib/server/verify-token.ts` (Firebase ID token verification via `jose` + Google JWKS), `lib/server/auth.ts` (`requireAdmin` — fails closed on misconfiguration), `lib/server/rate-limit.ts` (per-admin-email rate limiter via `@upstash/ratelimit`).
- Add client wrapper layer: `lib/api-client.ts` (authed fetch with one retry on 401 via `getIdToken(true)`; on second 401, redirect to sign-in), `apis/admin-api.ts` (typed wrappers), `types/admin-api.ts` (shared request/response contracts).
- Replace hardcoded admin email allowlist in `apps/admin/src/app/admin/page.tsx` with a `GET /api/admin/me` round-trip; the allowlist (`ADMIN_EMAILS`) lives only on the server. The dashboard renders a loading skeleton — never the admin shell — until the `isAdmin` result resolves.
- Audit-log every mutation route (`{ timestamp, adminEmail, action, target }` via `console.log`); rate-limit mutations per admin email.
- **Idempotency**: approve and reject mutations are idempotent on the server — a second call for an already-approved/rejected user returns 200 with no additional state change and no extra audit-log entry.
- **Distinct error UX**: client surfaces 401 (expired/invalid token) and 403 ("Your account does not have admin access") with different messages; 429 surfaces as "Too many requests — please retry shortly."
- **Audit/rate-limit gating**: keys on intent (mutation vs read), not HTTP verb. `POST /api/admin/users/by-ids` is a read despite using POST and is exempt from rate limiting.
- Add ESLint rule banning import of `@/lib/supabase` to prevent regression during phased rollout.
- Phase 3 deletes `lib/supabase.ts` and `apis/supabase-reads.ts`; drops `NEXT_PUBLIC_SUPABASE_URL` from admin Vercel env.
- **Out of scope**: migrating admin app from Firebase Auth to Supabase Auth (deferred), admin RLS policies, multi-role admin, sub-1h token revocation.

## Capabilities

### New Capabilities

- `admin-server-auth`: Verifies Firebase ID tokens server-side via Google JWKS, enforces an `ADMIN_EMAILS` allowlist that fails closed on misconfiguration, and exposes `GET /api/admin/me` for client-side route gating without leaking admin identities. Includes the client-side `api-client.ts` retry + redirect contract.
- `admin-supabase-routes`: Next.js Route Handlers that proxy admin reads and mutations to Supabase using `service_role`, replacing direct client-side Supabase calls. Covers boards, users, posts, app-config, and approval mutations. All routes require `requireAdmin` and use the server-only Supabase client.
- `admin-mutation-safeguards`: Mandatory audit logging, idempotency, and per-admin-email rate limiting on every mutation route, so a stolen 1h ID token cannot exfiltrate the database undetected and so network-retried mutations cannot double-execute.

### Modified Capabilities

<!-- None. There are no existing OpenSpec specs for the admin app yet. -->

## Why Route Handlers (and not Server Components / Server Actions)

Both Server Components and Server Actions would also keep `service_role` on the server. Route Handlers were chosen instead because:

- **Stable HTTP surface**: testable with `curl`, scriptable for negative auth tests, decoupled from any specific React component tree.
- **Uniform middleware**: `requireAdmin`, audit logging, and rate limiting apply identically at the route boundary, regardless of how the client renders.
- **Future portability**: a future split of the admin app away from Next.js (or addition of a CLI/script caller) does not require rewriting every mutation. Server Actions tie each mutation to a specific React tree.

## Impact

- **Broken pages restored**: `admin/page.tsx`, `admin/user-approval/page.tsx`, `admin/boards/page.tsx`, `admin/boards/[boardId]/page.tsx`, `admin/users/page.tsx`, `admin/posts/page.tsx`, `hooks/useCreateUpcomingBoard.ts`, `hooks/useRemoteConfig.ts`.
- **New dependencies**: `jose`, `@upstash/ratelimit` (and `@upstash/redis`).
- **New env vars (Vercel, server-only)**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `FIREBASE_PROJECT_ID`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- **Removed env var (Phase 3)**: `NEXT_PUBLIC_SUPABASE_URL` from admin app.
- **No DB schema changes; no RLS policy changes.** The admin path continues to bypass RLS via `service_role`, consistent with the comments in migration `20260301000000_reenable_rls.sql`.
- **Web app**: unaffected.
- **No feature gap during rollout**: Phase 1 includes ALL mutations (approve/reject, board create, app-config write). Phase 2 is hardening + cleanup only. Admins do not lose write capability at any deploy boundary.
- **Throwaway-cost honesty**: the JWT verification layer is roughly 150–200 lines across `verify-token.ts`, `auth.ts`, `api-client.ts`, and the per-route `requireAdmin` preamble. When Supabase Auth migration eventually happens these are mechanical replacements — accepted in exchange for deferring the migration.

## Phased Rollout

- **Phase 0 — Foundations** (no user-facing change): dependencies, server modules, types, ESLint rule, Vercel env vars.
- **Phase 1 — Restore production** (all reads + ALL mutations): every broken page back; approve/reject/board-create/app-config-write all work; audit log + rate limit live.
- **Phase 2 — Hardening**: unit tests for `requireAdmin` (token validation, allowlist, fail-closed semantics); ESLint rule enforcement check in CI.
- **Phase 3 — Cleanup**: delete `lib/supabase.ts` and `apis/supabase-reads.ts`; drop `NEXT_PUBLIC_SUPABASE_URL`.
