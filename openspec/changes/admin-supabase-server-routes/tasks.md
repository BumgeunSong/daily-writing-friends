## 1. Phase 0 — Foundations

- [x] 1.1 Add dependencies to `apps/admin/package.json`: `jose`, `zod`, `server-only`. (`@upstash/ratelimit`/`@upstash/redis` removed — see 1.9.) **User must run `pnpm install` from monorepo root to apply lockfile changes.**
- [x] 1.2 Generated `supabase/types/database.ts` (974 lines) via `supabase gen types typescript --local`. Includes the 6 admin-touched tables: `app_config`, `board_waiting_users`, `boards`, `posts`, `user_board_permissions`, `users`.
- [ ] 1.3 **[BLOCKED — needs user]** Configure Vercel env vars (production + preview) for the admin app: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `FIREBASE_PROJECT_ID`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Verify via Vercel dashboard.
- [x] 1.4 ESLint rule (`no-restricted-imports`) banning `from '@/lib/supabase'` and `from '@/apis/supabase-reads'` added to `eslint.config.mjs`; server-only directories exempted.
- [x] 1.5 `apps/admin/src/lib/server/supabase.ts` created with `import 'server-only'` line 1 and `getServerSupabase()` factory.
- [x] 1.6 `apps/admin/src/lib/server/verify-token.ts` created with `createVerifier({ jwksUrl, projectId, clockTolerance })` factory, pinned `algorithms: ['RS256']`, and `getDefaultVerifier()` singleton.
- [x] 1.7 `apps/admin/src/lib/server/auth.ts` created. Module-load parses `ADMIN_EMAILS` (split → trim → lowercase → filter-empty → throw on empty). Exports `requireAdmin`, `verifyAdmin`, `authenticateOptional`, and `AdminAuthError` (codes: `unauthorized` (401), `forbidden` (403)).
- [x] 1.8 `apps/admin/src/lib/server/audit-log.ts` created. Exports `auditLog(entry)` emitting `console.log(JSON.stringify({...}))`; `sanitize()` strips `[\x00-\x1F\x7F]` from string fields; `AdminAction` typed union.
- [x] 1.9 **Rate limiting deferred — Upstash dropped at 2-admin scale.** Audit log + manual `ADMIN_EMAILS` rotation are the active defenses. Re-add later if telemetry shows abuse; the `with-admin` wrapper interface is unchanged so swapping in a limiter is local.
- [x] 1.10 `apps/admin/src/lib/server/with-admin.ts` created. Higher-order wrapper handling auth → handler → Zod validate → audit-log → JSON response. Mutation handlers return `{ data, mutated?, auditTarget? }`; audit log fires only when `mutated !== false`.
- [x] 1.11 `apps/admin/src/lib/api-client.ts` created. `adminFetch`, `adminGet`, `adminPost` wrappers. Calls `auth.currentUser.getIdToken(false)`; on 401 retries with `getIdToken(true)`; on second 401 redirects to `/login`. Throws typed `AdminAccessError` (403), `RateLimitError` (429 with `retryAfterSeconds` from `Retry-After`), `AdminApiClientError` (other). Test seam `__setRedirectForTests`.
- [x] 1.12 `apps/admin/src/types/admin-api-contracts.ts` created. Zod schemas + inferred types for all 16 routes. Date fields are `string` (ISO-8601); vestigial `waitingUsersIds` dropped. Canonical error envelope. `AdminAction` enum.

## 2. Phase 1 — Read routes

- [x] 2.1 Implement `GET /api/admin/me` (kind: read, action: n/a) returning `{ isAdmin: boolean }`. Note: this route uses `withAdmin` only for token verification — it returns `{ isAdmin: false }` (200) instead of 403 when the email is not in the allowlist (per spec D10). Implement as a special variant or use `requireAdmin` directly with an allowlist-soft path.
- [x] 2.2 `GET /api/admin/boards` via `withAdmin('read', ...)` returning raw `SupabaseBoard[]` (snake_case to mirror existing page consumption — pages can adopt `mapToBoard` helper as needed).
- [x] 2.3 `GET /api/admin/boards/[id]` returns 404 on PGRST116, 200 with board otherwise.
- [x] 2.4 `GET /api/admin/boards/last` returns `{ board: null }` when no boards exist.
- [x] 2.5 `GET /api/admin/boards/[id]/users` mirrors `fetchBoardUsers` shape.
- [x] 2.6 `GET /api/admin/boards/[id]/waiting-users` mirrors `fetchWaitingUserIds` shape.
- [x] 2.7 `GET /api/admin/users` mirrors `fetchAllUsers`.
- [x] 2.8 `GET /api/admin/users/search?q=...` with min-length 2 + char-escape.
- [x] 2.9 `POST /api/admin/users/by-ids` declared `kind: 'read'` — exempt from rate-limit + audit despite POST verb.
- [x] 2.10 Implement `GET /api/admin/users/[id]/previous-cohort-posts?cohort=N` wrapping `fetchPreviousCohortPostCount` query.
- [x] 2.11 Implement `GET /api/admin/posts?boardId=X&range=week|all` wrapping `fetchPosts` query.
- [x] 2.12 Implement `GET /api/admin/app-config` wrapping `fetchAppConfig` query.

## 3. Phase 1 — Mutation routes

- [x] 3.1 `POST /api/admin/users/approve` — atomic `delete().eq().eq().select()` (DELETE...RETURNING) followed by `upsert({ permission: 'write' })`. Returns `{ status: 'approved'|'already-handled', firstTime }`; sets `mutated: false` for already-handled to suppress audit log.
- [x] 3.2 `POST /api/admin/users/reject` — atomic delete-only (matches existing inline reject behavior; no rejection table). Same idempotency pattern as approve.
- [x] 3.3 `POST /api/admin/boards` — inserts row from `CreateBoardRequest`. Audit target excludes user-content fields (just `boardId` + `cohort`).
- [x] 3.4 `POST /api/admin/app-config` — upserts both keys atomically; re-reads config for response.

## 4. Phase 1 — Client wrappers and React Query keys

- [x] 4.1 `apps/admin/src/apis/admin-api.ts` created with `getMe`, `getBoards`, `getBoard`, `getLastBoard`, `getBoardUsers`, `getWaitingUsers`, `getUsers`, `searchUsers`, `getUsersByIds`, `getPreviousCohortPostCount`, `getPosts`, `getAppConfig`, `approveUser`, `rejectUser`, `createBoard`, `updateAppConfig`.
- [x] 4.2 `adminQueryKeys` exported in same file: `me`, `boards`, `board(id)`, `boardLast`, `boardUsers(id)`, `waitingUsers(id)`, `users`, `userSearch(q)`, `usersByIds(ids)`, `previousCohortPosts(userId, cohort)`, `posts(boardId, range)`, `appConfig`.

## 5. Phase 1 — Page rewrites

- [x] 5.1 `app/admin/page.tsx` — calls `getMe()` via React Query; loading skeleton while `meData === undefined`; redirects unsigned-in users; gates content on `isAdmin === true`. No admin email literal remains in the bundle.
- [x] 5.2 `app/admin/user-approval/page.tsx` — uses `getBoards/getBoard/getWaitingUsers/getPreviousCohortPostCount` for reads and `approveUser/rejectUser` for mutations. Optimistic update preserved. Approve/reject toasts now report `firstTime` (idempotent retry feedback).
- [x] 5.3 `app/admin/boards/page.tsx` — uses `getBoards`. Date columns parsed with `parseIsoDate` helper from board's snake_case `first_day`/`last_day`.
- [x] 5.4 `app/admin/boards/[boardId]/page.tsx` — uses `getBoard/getBoardUsers/getWaitingUsers/searchUsers`. Inline `addUserMutation` (manual permission grant) routes through `approveUser` since both grant write permission. Approve route updated to use INSERT-with-unique-violation-catch so it works for both flows (waiting list approval and manual grant).
- [x] 5.5 `app/admin/users/page.tsx` — placeholder page (no Supabase calls); no migration needed. Confirmed via Read.
- [x] 5.6 `app/admin/posts/page.tsx` — uses `getBoards/getPosts/getUsersByIds`.
- [x] 5.7 `hooks/useRemoteConfig.ts` — uses `getAppConfig/updateAppConfig` and `adminQueryKeys.appConfig`.
- [x] 5.8 `hooks/useCreateUpcomingBoard.ts` — uses `getLastBoard` for the read and `createBoard` for the write. UUID still generated client-side via `crypto.randomUUID()`.

## 6. Phase 2 — Hardening and CI gates

- [ ] 6.1 Add CI step: `grep -r 'SUPABASE_SERVICE_ROLE_KEY' apps/admin/src/` and assert matches appear ONLY under `apps/admin/src/lib/server/`. Fail the build otherwise.
- [ ] 6.2 Add CI step: `grep -rn 'ADMIN_EMAILS' apps/admin/src/ --include='*.tsx' --include='*.ts'` and assert matches appear ONLY under `apps/admin/src/lib/server/`. Fail the build otherwise.
- [ ] 6.3 Add CI step: smoke-test all 16 routes using a test admin token (signed by a test JWKS). For each route assert: 200 with no Authorization header → fail; 401 with no header; 403 with non-admin token; 200 with admin token. Fail the build on any deviation.
- [ ] 6.4 Add CI build matrix entry that builds with `ADMIN_EMAILS=""`; assert the build (or first import of `auth.ts` during smoke test) fails with the documented error message.
- [ ] 6.5 Verify `next build` fails when a `'use client'` file imports `@/lib/server/supabase` (regression guard for the original bug). Add this as an automated check.

## 7. Phase 3 — Cleanup

- [ ] 7.1 Delete `apps/admin/src/lib/supabase.ts`.
- [ ] 7.2 Delete `apps/admin/src/apis/supabase-reads.ts`.
- [ ] 7.3 Remove `NEXT_PUBLIC_SUPABASE_URL` from the admin app's Vercel env (production + preview). Verify via Vercel dashboard.
- [ ] 7.4 Re-run the Phase 2 grep audits and bundle search to confirm zero matches for service role key, admin emails, or the legacy import path.

## Tests

### Unit (Vitest)

- [ ] T.1 `verify-token.ts` via `createVerifier` factory: valid RS256 admin token → claims; `alg: none` → throws; `alg: HS256` (HMAC using public key) → throws; expired token → throws; wrong `iss` → throws; wrong `aud` → throws; garbage → throws; missing email claim → throws; whitespace-only email → throws. Mock JWKS via in-process `http` server in `beforeAll` returning generated RS256 key pair.
- [ ] T.2 `auth.ts` allowlist parsing: input `" Foo@Bar.com , , bob@example.com "` → `["foo@bar.com", "bob@example.com"]`. Module-load throw cases (run via `execa` child processes): `ADMIN_EMAILS=""`, `"   "`, `","`, `" , , "`, unset — all throw at import. Vitest cannot test module-load throws in-process because of the module cache.
- [ ] T.3 `auth.ts` `requireAdmin`: case-insensitive email match (`FOO@BAR.COM` claim, `foo@bar.com` allowlist → admin); empty/whitespace email claim → throws; non-allowlisted email → throws with 403-mapping marker.
- [ ] T.4 `audit-log.ts`: control-char sanitization on `adminEmail` (newlines, tabs, ANSI escapes stripped); JSON output is single-line; typed `action` union enforced at compile time.
- [ ] T.5 `rate-limit.ts`: under-threshold → `{ ok: true }`; over-threshold → `{ ok: false, retryAfterSeconds }`; per-email isolation; reads always return `{ ok: true }`. Mock Upstash client. Backend error throws.
- [ ] T.6 `with-admin.ts` wrapper: read-kind skips rate limit; mutation-kind invokes rate limit; rate-limit failure short-circuits with 429 + `Retry-After` header; handler exception maps to canonical `{ error, code, status }`; audit log emitted on mutation success only (verify via injected spy).
- [ ] T.7 `api-client.ts` retry logic: proactive refresh when `exp - now < 30`; one retry on 401 with refreshed token; second 401 invokes redirect; 403 throws `AdminAccessError`; 429 with `Retry-After: 30` throws `RateLimitError({ retryAfterSeconds: 30 })`. Mock fetch + Firebase user.
- [ ] T.8 Zod schemas in `admin-api-contracts.ts`: representative valid payload validates; missing required field fails; wrong-typed field fails; extra field rejected.

### Integration (Vitest + supertest + Supabase local Docker)

- [ ] T.9 Each route × negative auth (no header → 401, garbage → 401, non-admin token → 403, expired → 401, valid admin → 200). Use the in-process JWKS to mint a test admin token signed for the test allowlist.
- [ ] T.10 Each read route returns the same shape its contract type declares (Zod validates + supertest asserts).
- [ ] T.11 Approve idempotency: call `POST /api/admin/users/approve` for a fresh waiting user → 200, `firstTime: true`, audit log emitted, DB row removed from `board_waiting_users`, permission row created. Call again immediately → 200, `firstTime: false`, NO audit log entry, NO DB write.
- [ ] T.12 Reject idempotency: same pattern as approve.
- [ ] T.13 Mutation rate-limit: hit `POST /api/admin/users/approve` 61 times in 60 seconds for the same admin email → 61st returns 429 with `Retry-After` header.
- [ ] T.14 Read rate-limit exemption: hit `POST /api/admin/users/by-ids` 100 times rapidly → all return 200 (no 429).
- [ ] T.15 Per-admin-email isolation: admin A exhausts limit → admin B's mutations still succeed.
- [ ] T.16 Upstash outage: stub rate-limit backend to throw → mutation routes return 503 `{ code: 'server-error' }`; read routes still return 200.
- [ ] T.17 `GET /api/admin/me`: admin token → `{ isAdmin: true }`; valid non-admin Firebase token → `{ isAdmin: false }` (NOT 403); no token → 401.
- [ ] T.18 Notification triggers: approve mutation in local Supabase fires the expected DB triggers (per project memory: triggers must be handled in local Supabase setup). Verify by side-effect (notification row created or whatever the trigger does).
- [ ] T.19 Test data cleanup: `afterEach` removes test user UUID from `users`, `board_waiting_users`, `user_board_permissions` (and any rejection table). Confirm no test pollution between runs.

### E2E (agent-browser + dev3000)

- [ ] T.20 Admin sign-in → dashboard loads. Assert no flash of admin-shell content while `/api/admin/me` is in flight (loading skeleton visible).
- [ ] T.21 User-approval happy path: page loads boards + waiting users; click Approve → row disappears optimistically; backend confirms; audit log JSON line visible in dev server output.
- [ ] T.22 User-approval reject path: same but with reject button.
- [ ] T.23 Board create flow: open settings → submit new board → success.
- [ ] T.24 App-config update flow: open settings → edit config → save → success.
- [ ] T.25 Boards list, boards/[id], users, posts pages all render without errors.
- [ ] T.26 Token expiry mid-flow: simulate by clearing the in-memory token cache; next request triggers `getIdToken(true)`; UI flow completes without visible error.
- [ ] T.27 Second 401: simulate by also invalidating the refreshed token; UI redirects to sign-in.
- [ ] T.28 429 path: hit the rate limit; UI shows "Too many requests — retry in Ns" with a concrete number from `Retry-After`.
- [ ] T.29 403 path: sign in with a Firebase account whose email is not in `ADMIN_EMAILS`; UI shows "Your account does not have admin access" (distinct from 401 message).

### E2E Local DB (Supabase Docker)

- [ ] T.30 Concurrency: fire two simultaneous `POST /api/admin/users/approve` calls for the same `{ userId, boardId }`. Assert exactly one permission row created, exactly one audit log entry emitted.
- [ ] T.31 RLS posture sanity: server route uses service_role and bypasses RLS as expected; same query with anon key fails. Confirms migration `20260301000000_reenable_rls.sql` is correctly applied.

### Manual verification before production deploy

- [ ] T.32 Production browser DevTools (Sources tab → search): the literal `SUPABASE_SERVICE_ROLE_KEY` value does not appear anywhere in admin bundle.
- [ ] T.33 Production browser DevTools: no admin email literal appears anywhere in admin bundle.
- [ ] T.34 Production: load `/admin`, `/admin/user-approval`, `/admin/boards`, `/admin/boards/[id]`, `/admin/users`, `/admin/posts`, `/admin/settings` — all render without "missing key" errors.
- [ ] T.35 Production: perform one approve and one reject end-to-end; verify Vercel logs show one parseable JSON audit log entry per action.
