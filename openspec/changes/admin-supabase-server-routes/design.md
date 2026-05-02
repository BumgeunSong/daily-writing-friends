## Context

The admin app (`apps/admin/`, Next.js 15, deployed at `admin.dailywritingfriends.com`) currently throws `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` on every Supabase-dependent page in production. Root cause: `'use client'` components import `getSupabaseClient()`, which reads `process.env.SUPABASE_SERVICE_ROLE_KEY`. Next.js never inlines non-`NEXT_PUBLIC_` env vars into the client bundle, so the key is `undefined` in the browser by design.

Restoring the `NEXT_PUBLIC_` prefix would re-introduce the security incident that commit `8c92bb8f` (April 2026) closed: the service role key was leaking to every browser visitor, granting full RLS-bypassing DB access to anyone with DevTools.

The web app uses Supabase Auth + RLS (migration `20260301000000_reenable_rls.sql`). That migration explicitly excludes admin operations: comments document that `boards` and `board_waiting_users` writes go through `service_role` from the admin app. The admin app uses Firebase Auth + a hardcoded email allowlist for gating; this is a deliberate split, not an accident.

This design moves all admin Supabase calls behind Next.js Route Handlers so the service role key stays server-side, while preserving the admin/web auth split.

## Goals / Non-Goals

**Goals:**

- Restore every broken admin page (dashboard, user-approval, boards, boards/[id], users, posts) to fully functional state on first deploy of Phase 1.
- Keep `SUPABASE_SERVICE_ROLE_KEY` strictly server-side; verify by build-time guard (`server-only`) and grep-based audit.
- Verify Firebase ID tokens server-side with pinned algorithm and explicit claim validation, without taking a `firebase-admin` dependency.
- Audit-log and rate-limit every admin mutation so a stolen 1h token has bounded blast radius.
- Provide a stable HTTP API surface (`/api/admin/**`) with a single typed contract, decoupled from React tree internals and testable with `curl`.
- Fail closed on misconfiguration (`ADMIN_EMAILS=""`, missing env var, empty/whitespace email claim) — the routes refuse to handle requests rather than allowing them.

**Non-Goals:**

- Migrating admin from Firebase Auth to Supabase Auth (deferred — see proposal).
- Admin RLS policies on Supabase tables (rejected — service_role is the design).
- Multi-role admin (super_admin / moderator / read-only) — single allowlist sufficient at 2-user scale.
- Token revocation shorter than Firebase's 1h ID token lifetime (Firebase limitation; rate limit + allowlist rotation are compensating controls).
- Replacing Supabase reads with a query DSL — the route handlers wrap existing `supabase-reads` functions one-to-one for reads. Mutations are written fresh in route handlers (no current `supabase-reads` equivalent for approve/reject).

## Decisions

### D1. Pattern C: server routes + service_role

| Option | Verdict |
|---|---|
| Restore `NEXT_PUBLIC_` prefix | **Rejected** — re-opens the April 2026 incident. |
| Anon key + admin RLS policies | **Rejected** — admin uses Firebase Auth; `auth.jwt()` claims are not natively available without first migrating auth. RLS migration explicitly assumes admin uses service_role. |
| Server Components / Server Actions | **Rejected** — couples mutations to React tree, makes negative auth tests harder, prevents future split of admin app from Next.js. |
| **Route Handlers + service_role (Pattern C)** | **Chosen** — matches Supabase's recommended admin tooling pattern. Stable HTTP surface, uniform middleware, framework-agnostic future. |

### D2. Token verification via `jose` + Google JWKS — algorithm pinned, claims validated explicitly

Verify Firebase ID tokens by fetching Google's JWKS at `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` and validating signature + standard claims.

**Required `jose.jwtVerify` options** (the design contract — implementation must use exactly these):

```ts
await jwtVerify(token, jwks, {
  issuer: `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID}`,
  audience: process.env.FIREBASE_PROJECT_ID,
  algorithms: ['RS256'],     // pinned — defends against alg=none and HS256-using-public-key attacks
  clockTolerance: 30,        // seconds — accommodates minor clock skew
});
```

`jose` validates `exp` and `nbf` automatically when present. The `algorithms` parameter is mandatory: omitting it is a known JWT vulnerability class.

**Why over `firebase-admin`:**
- 3 fewer env vars (no `FIREBASE_CLIENT_EMAIL`, no `FIREBASE_PRIVATE_KEY`).
- No cold-start cost from `firebase-admin` initialization.
- `jose` caches JWKS at module level — first request pays one ~50ms fetch; subsequent share.
- When Supabase Auth migration eventually happens, deleting `jose` is cleaner than uninstalling a heavier `firebase-admin` integration.

**Throwaway cost honesty:** ~150–200 lines (verify-token.ts + auth.ts + per-route preamble + api-client retry). Mechanical replacement during eventual Supabase Auth migration. Honestly larger than the original "30 lines" estimate.

**Test injection point:** `verify-token.ts` exports a factory `createVerifier({ jwksUrl, projectId })` so tests can substitute a local JWKS endpoint and a generated key pair. Module-level singleton (`defaultVerifier`) used by routes; tests use the factory.

### D3. `requireAdmin` fails closed at module load — robust allowlist parsing

`apps/admin/src/lib/server/auth.ts` parses `ADMIN_EMAILS` (comma-separated) at module import:

```ts
const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(e => e.length > 0);
if (adminEmails.length === 0) {
  throw new Error('ADMIN_EMAILS is empty or unset — admin routes refuse to start.');
}
```

This rejects: missing var, empty string, whitespace-only, comma-only (`","`), comma+whitespace (`" , , "`). Allowlist comparisons are case-insensitive (both sides lowercased).

CI test: import the module with `ADMIN_EMAILS=""`, `ADMIN_EMAILS="   "`, and `ADMIN_EMAILS=","` each in a child process; assert all three throw at module load. Process isolation is required because Vitest's module cache prevents observing module-load throws after the first import.

Email-claim handling inside `requireAdmin`:
- Empty/null/whitespace email claim → 401.
- Email present but not in allowlist (after lowercase) → 403.
- Token signature/`iss`/`aud`/`exp`/`alg` invalid → 401.

The 401 vs 403 distinction is preserved through to the client so it can display "session expired" vs "your account does not have admin access" with different UX.

### D4. Server-only Supabase client, `withAdmin` wrapper to eliminate boilerplate

`apps/admin/src/lib/server/supabase.ts` starts with `import 'server-only'`. Next.js fails the build if any client component imports it. This is the structural guarantee that prevents the original bug from recurring.

A separate ESLint rule bans `from '@/lib/supabase'` (the old, deleted-in-Phase-3 path) anywhere in `apps/admin/src/`. Two-layer defense: `server-only` blocks the new path; ESLint blocks the old.

**Higher-order wrapper to prevent copy-paste auth-bypass:** every route uses a `withAdmin` helper:

```ts
// lib/server/with-admin.ts
type RouteKind = 'read' | 'mutation';
export function withAdmin<T>(
  kind: RouteKind,
  action: string,                              // typed audit-log action, see D5
  handler: (ctx: { req: NextRequest; admin: { email: string } }) => Promise<T>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req) => {
    const admin = await requireAdmin(req);     // throws → caught below as 401/403
    if (kind === 'mutation') {
      const limited = await rateLimit(admin.email);
      if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds);
    }
    try {
      const result = await handler({ req, admin });
      if (kind === 'mutation') auditLog({ adminEmail: admin.email, action, target: result });
      return NextResponse.json(result);
    } catch (e) { /* uniform error mapping */ }
  };
}
```

Each route file becomes ~10 lines: declare kind + action, write the query, return data. A missed `requireAdmin` becomes structurally impossible — every route goes through `withAdmin`.

### D5. Audit log: structured JSON, sanitized fields, typed action enum

Every mutation route logs via a single helper:

```ts
// lib/server/audit-log.ts
type AdminAction =
  | 'user.approve'
  | 'user.reject'
  | 'board.create'
  | 'app-config.update';
const sanitize = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, '');  // strip control chars
export function auditLog(entry: { adminEmail: string; action: AdminAction; target: unknown }) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    adminEmail: sanitize(entry.adminEmail),
    action: entry.action,
    target: entry.target,  // serialized by JSON.stringify; non-string fields preserved
  }));
}
```

- `JSON.stringify` ensures Vercel's log pipeline gets a single parseable line per entry.
- `action` is a typed enum so log queries are stable.
- `sanitize` strips control characters from admin email to prevent log injection (newlines, ANSI escapes).
- `target` should be a user ID or board ID rather than an email where possible, to limit PII in logs. When the target is a user being approved/rejected, log the user's UUID (Supabase `users.id`), not their email.

**Test injection:** the route handlers receive `auditLog` via the `withAdmin` wrapper's closure; tests provide a spy implementation, removing the `vi.spyOn(console, 'log')` fragility.

### D6. Idempotency for state-transition mutations — atomic conditional update

`POST /api/admin/users/approve` and `POST /api/admin/users/reject` are idempotent at the database layer using a conditional update. Pattern:

```ts
// approve: move user from board_waiting_users to user_board_permissions
const { data: deletedRows } = await supabase
  .from('board_waiting_users')
  .delete()
  .eq('user_id', userId)
  .eq('board_id', boardId)
  .select();   // returns [] if already deleted (already approved or already rejected)

if (deletedRows.length > 0) {
  // First time through: create the permission row, emit audit log
  await supabase.from('user_board_permissions').upsert({...}, { onConflict: 'user_id,board_id' });
  return { status: 'approved', firstTime: true };
}
return { status: 'already-handled', firstTime: false };
```

The `DELETE ... RETURNING` is atomic in Postgres: a concurrent second call sees zero rows and exits cleanly. **No SELECT-then-WRITE race.** No duplicate audit entries (`auditLog` is only called when `firstTime: true`).

Reject follows the same pattern (delete waiting row + insert into a `rejected_users` table or set status flag — implementation TBD per existing schema).

`POST /api/admin/boards` and `POST /api/admin/app-config` are not idempotent: they're explicit "create another / overwrite" actions. UI disables the submit button during the in-flight request to prevent accidental duplicates.

### D7. Client retry on 401, proactive token refresh, typed error responses

`apps/admin/src/lib/api-client.ts`:

1. **Proactive refresh:** before every request, if the cached Firebase ID token's `exp` is within 30 seconds, call `getIdToken(true)` first. Avoids paying the 401 round-trip on every stale-page-load.
2. Attach `Authorization: Bearer ${token}`.
3. **On 401:** call `getIdToken(true)` (forces refresh) and retry once.
4. **On second 401:** redirect the browser to the admin sign-in route.
5. **On 403:** throw a typed `AdminAccessError` rendered as "Your account does not have admin access."
6. **On 429:** throw a typed `RateLimitError` carrying `retryAfterSeconds` (read from `Retry-After` header). Rendered as `Too many requests — retry in ${seconds}s.`
7. **On 5xx / network error:** throw a typed `AdminApiError`; calling component decides retry/toast UX.

**Canonical error response shape** (every route):

```ts
// types/admin-api-contracts.ts
export type AdminApiError = { error: string; code: 'unauthorized' | 'forbidden' | 'rate-limited' | 'bad-request' | 'server-error' };
```

429 responses also include `Retry-After: <seconds>` header so the client message is honest about the wait.

### D8. Single source of truth for HTTP contracts — separated from entity types

The admin app already has `types/firestore.ts` (legacy entity-model types) and `types/userAgent.ts`. Mixing HTTP request/response contracts into `types/` would blur the line between "what the DB returns" and "what the HTTP API returns."

**Naming choice:** put HTTP contracts at `apps/admin/src/types/admin-api-contracts.ts`. The `-contracts` suffix signals HTTP-layer (not entity-layer) and prevents accidental imports of internal entity shapes from the wrong file.

For each route, define `RequestType` and `ResponseType`. **Date fields are `string` (ISO-8601), not `Date`** — JSON serialization unconditionally converts `Date` to string, so the contract must reflect HTTP reality. Page components doing `instanceof Date` checks (currently done by `mapToBoard` consumers) must be updated to consume strings or to construct `Date` from strings explicitly.

**Vestigial fields:** `Board.waitingUsersIds: string[]` is always `[]` (Firestore-era residue per `mapToBoard` in `supabase-reads.ts`). The HTTP contract drops this field; pages still on the old type continue compiling because `string[]` and absent are both compatible with most usage sites. Audit removed-field consumers during Phase 1 page rewrites.

**Runtime validation (Zod):** every route response is run through a Zod schema before `NextResponse.json()`. Two lines per route. Catches accidental extra-field leaks (e.g., a service-internal field showing up in the response) and provides a runtime guarantee, not just a TypeScript hope.

### D9. Phase 1 ships ALL mutations

Original plan deferred `POST /api/admin/boards`, `POST /api/admin/app-config`, and the `useCreateUpcomingBoard` mutation to Phase 2, leaving those features read-only at the Phase 1 boundary. Proposal review surfaced that admins would have no UX signal for the disabled state — they would conclude the app was still broken.

Resolution: Phase 1 includes all mutations (approve, reject, board create, app-config update). Phase 2 becomes hardening only. No deploy boundary leaves admins without write capability.

Note: approve/reject mutations are **new code**, not wrappers of `supabase-reads.ts`. The existing inline mutations live in `apps/admin/src/app/admin/user-approval/page.tsx:143-216`. The Phase 1 route handlers replicate that logic on the server with the conditional-update idempotency guarantee from D6.

### D10. Client-side admin check via `GET /api/admin/me`

The dashboard route (`app/admin/page.tsx`) currently has a hardcoded `Set<string>` of admin emails. That set sits in the client bundle and leaks every admin's identity to any visitor — useful information for targeted phishing.

Replace with `GET /api/admin/me` returning `{ isAdmin: boolean }`. The route reads `ADMIN_EMAILS` server-side. The dashboard renders a loading skeleton (not the admin shell) until the response resolves. Non-admins are redirected away before any admin UI appears.

**Accepted information leak:** an attacker with any valid Firebase ID token can probe `/api/admin/me` to learn whether that account is an admin. This is fundamental to the endpoint's purpose; the alternative (returning 403 for non-admins instead of `{ isAdmin: false }`) gives the same information via status code. Documented and accepted at 2-admin scale.

### D11. Generated Supabase database types

Currently the codebase hand-writes row types in `apps/admin/src/apis/supabase-reads.ts:8-57` (`SupabaseBoard`, `SupabaseUser`, etc.). This is drift-prone: a column rename in a migration must be followed by manual updates here.

**Phase 0 task:** run `supabase gen types typescript` against the local Supabase, commit output to `supabase/types/database.ts`, import row types from there. The HTTP contracts in `admin-api-contracts.ts` reference these generated types for fields that mirror the DB. One-time 15-minute task that eliminates a class of drift bugs.

### D12. Query keys for React Query

Pages currently use ad-hoc query keys: `['boards']`, `['board', boardId]`, `['waitingUsers', boardId, cohort]`. To prevent cache-invalidation drift between pages and the new client wrappers, define query keys in `apis/admin-api.ts` alongside the route wrappers:

```ts
export const adminQueryKeys = {
  me: ['admin', 'me'] as const,
  boards: ['admin', 'boards'] as const,
  board: (id: string) => ['admin', 'board', id] as const,
  waitingUsers: (boardId: string, cohort: number) => ['admin', 'waitingUsers', boardId, cohort] as const,
  // ... one per route
};
```

Pages import these instead of inlining strings.

## Risks / Trade-offs

- **`requireAdmin` fails open on misconfiguration** → module-level startup check throws if `ADMIN_EMAILS` parses to empty (after trim/case-fold/empty-filter). CI test in child process verifies module-load failure across multiple bad inputs.
- **JWT `alg` substitution attack** → `algorithms: ['RS256']` pinned in `jwtVerify` options. Required by D2.
- **ID token expires mid-session (1h)** → `api-client.ts` proactively refreshes when `exp - now < 30s`; retries once with `getIdToken(true)` on 401; second 401 → redirect to sign-in.
- **Stolen ID token grants 1h of full service_role access** → 60 mutations/min × 60min = 3600 max. Compensating controls: per-admin-email rate limit + audit log identifies abuse + `ADMIN_EMAILS` rotation as a fast manual killswitch. Trade-off accepted; lower mutation rate could be introduced if telemetry shows high mutation volume from one email is anomalous.
- **`/api/admin/me` admin-status discovery oracle** → fundamental to the endpoint; accepted at 2-admin scale.
- **Audit log PII** → log user UUIDs as `target`, not emails, where the target is a user. Sanitize all string fields against control-char log injection. Document that `adminEmail` itself is logged.
- **Local dev env vars** → already loaded from monorepo root via `loadEnvConfig` in `next.config.ts`.
- **CSRF** → header-based `Authorization: Bearer`; browsers don't auto-attach cross-origin headers; not a concern.
- **Client/server type drift across 16 routes** → `types/admin-api-contracts.ts` single source of truth + Zod runtime validation per route response.
- **Service_role action with no `auth.uid()` attribution in DB** → mandatory audit log per mutation route includes verified admin email.
- **Old broken `lib/supabase.ts` imported between Phase 1 and Phase 3** → ESLint rule blocks the import path from Phase 0 onwards.
- **JWKS fetch latency on cold instance** → `jose` caches JWKS at module-level; first request pays ~50ms; subsequent share.
- **Upstash Redis outage causes admin downtime** → rate limiter fails closed (returns 503) so an outage doesn't unlock unlimited mutations. Manual emergency bypass: rotate `ADMIN_EMAILS` (instant kill of stolen token; admin re-adds themselves).
- **JWT throwaway cost is ~150–200 lines, not 30** → accepted; mechanical replacements during eventual Supabase Auth migration.
- **Phase 1 PR is large** (Foundations + all mutations + 8 page rewrites + Zod + generated types + withAdmin wrapper) → smoke-test script in CI (`curl` each of the 16 endpoints with a test admin token, assert 200) catches a quietly-broken route before deploy. Split commits within the PR by file group for reviewability.

## Migration Plan

### Phase 0 — Foundations (no user-facing change)
- Add `jose`, `@upstash/ratelimit`, `@upstash/redis`, `zod` to `apps/admin/package.json`.
- Run `supabase gen types typescript` and commit `supabase/types/database.ts`.
- Create `lib/server/{supabase,verify-token,auth,with-admin,rate-limit,audit-log}.ts` and `lib/api-client.ts`.
- Create `types/admin-api-contracts.ts` with Request/Response/Error types and Zod schemas.
- Add ESLint rule banning `from '@/lib/supabase'`.
- Configure Vercel env vars (production + preview): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `FIREBASE_PROJECT_ID`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- No code paths use the new modules yet; deploy is safe.

### Phase 1 — Restore production (covers ALL broken pages and mutations)
- Create routes via `withAdmin`: `/me`, all reads (boards, board, board-users, waiting-users, all-users, search, users-by-ids, posts, app-config, previous-cohort-posts, boards/last), all mutations (approve, reject, board-create, app-config-update).
- Refactor every page importing `supabase-reads` or `getSupabaseClient`:
  - `admin/page.tsx` (uses `/api/admin/me` + loading skeleton)
  - `user-approval/page.tsx` (reads + approve/reject)
  - `boards/page.tsx`, `boards/[boardId]/page.tsx`, `users/page.tsx`, `posts/page.tsx`
  - `useRemoteConfig.ts`, `useCreateUpcomingBoard.ts`
- Test against local Supabase (per `feedback_local_vs_prod` memory: must apply all migrations + handle notification triggers before running app against local Supabase).
- CI smoke test: hit every route with a valid admin token (or test-time-injected `requireAdmin`) and assert 200.
- Deploy. Production: every page renders, every mutation works.

### Phase 2 — Hardening
- Add unit tests: `verify-token.ts` (alg-pinning, claim validation, JWKS factory injection), `auth.ts::requireAdmin` (allowlist parsing in child processes for fail-closed cases, case-insensitive comparison, empty-claim rejection), `audit-log.ts` (sanitization), `with-admin.ts` wrapper.
- Add integration tests: each route with valid/invalid/expired/non-admin tokens (automated via `supertest` against the route handler, not manual `curl`). Test data fixture: a test admin with a pre-signed JWT verified by an in-process JWKS.
- CI check: build with `ADMIN_EMAILS=""` fails with a clear error message.
- CI check: `grep -r 'SUPABASE_SERVICE_ROLE_KEY' apps/admin/src/` returns only `lib/server/`.
- CI check: `grep -rn 'ADMIN_EMAILS' apps/admin/src/ --include='*.tsx' --include='*.ts'` returns only `lib/server/`.

### Phase 3 — Cleanup (security boundary)
- Delete `apps/admin/src/lib/supabase.ts`.
- Delete `apps/admin/src/apis/supabase-reads.ts`.
- Drop `NEXT_PUBLIC_SUPABASE_URL` from admin Vercel env.
- Verify with grep + production bundle search (DevTools → Sources): no service role key, no admin emails.

### Rollback strategy

- Phase 0: pure additive; revert by removing files and env vars.
- Phase 1: revert by `git revert` of the page changes; routes can stay deployed (unused) or be removed in a follow-up. Reverting page changes restores the broken state, but production was already broken — the rollback floor is the current broken state, not "working." The CI smoke-test gate makes a fully-broken Phase 1 deploy unlikely; a single broken route could be fixed forward.
- Phase 2: pure additive (tests); revert is trivial.
- Phase 3: `git revert` restores the old files; ESLint rule still blocks accidental imports.

## Open Questions

- Does Vercel's log pipeline retain `console.log` JSON output long enough for incident forensics (e.g., 30 days)? **Working assumption**: Vercel's default retention (30 days on Pro, ≥7 days on Hobby) is sufficient for current volume. If incident retrospectives later need longer history, swap the `auditLog` helper to write to a `audit_log` Supabase table (interface-compatible swap, no route handler changes).
- Should the rate-limit threshold differ for reads-via-POST vs mutations? **Working assumption**: 60/min for mutations is fine; reads are unlimited; revisit only if a legitimate batch workflow trips the mutation limit.
- Should mutation rate be lower than 60/min given 3600 mutations/h is a realistic blast-radius for a stolen token? **Working assumption**: 60/min is the documented baseline; the audit log + manual `ADMIN_EMAILS` rotation are the compensating controls. Reduce if telemetry post-launch shows high anomalous volume.

## Testability Notes

### Unit (Layer 1) — Vitest

Pure-logic units (each unit test imports through a factory or with mocked dependencies — no module-level singletons leak between tests):

- `verify-token.ts` via `createVerifier({ jwksUrl, projectId })` factory:
  - Valid signature + correct iss/aud/exp/alg → returns claims.
  - Wrong issuer → throws (401-mapping in `requireAdmin`).
  - Wrong audience → throws.
  - Expired token → throws.
  - `alg: none` → throws (alg pinning).
  - `alg: HS256` using public key as HMAC → throws.
  - Empty/null/whitespace email claim → throws.
  - Mock JWKS via in-process `http` server started in `beforeAll` returning a generated key pair.
- `auth.ts::requireAdmin`:
  - Allowlist parsing via child-process tests (`execa`) for module-load throws: `ADMIN_EMAILS=""`, `"   "`, `","`, `" , , "` all throw at import.
  - Allowlist parsing happy-path: trims, lowercases, dedupes.
  - Case-insensitive comparison (`Foo@Bar.com` matches `foo@bar.com`).
- `rate-limit.ts`: counter increments, window expiry, threshold boundary, `Retry-After` math. Mock Upstash client.
- `api-client.ts` retry logic: pure with mocked fetch and a mocked Firebase user. First 401 → retry with refreshed token. Second 401 → redirect call invoked. 403 → `AdminAccessError`. 429 with `Retry-After: 30` → `RateLimitError({ retryAfterSeconds: 30 })`. Proactive refresh fires when `exp - now < 30`.
- `audit-log.ts`: control-char sanitization, JSON shape, no PII in `target` when target is a user UUID.
- `with-admin.ts`: read kind skips rate-limit; mutation kind invokes rate-limit; rate-limit failure short-circuits with 429 + `Retry-After`; handler exception maps to canonical error shape; audit log emitted only on mutation success.

### Integration (Layer 2) — Vitest + supertest

Boundary contracts (one boundary at a time, automated):
- Route handler ↔ Supabase: each route called with an injected `requireAdmin` returning a fixed admin email; verify the SQL/query against local Supabase (Docker) with all migrations applied.
- Route handler ↔ `requireAdmin`: each route via supertest with (a) no Authorization header → 401, (b) token signed by a non-allowlisted email → 403, (c) expired token → 401, (d) garbage token → 401, (e) valid admin token (signed by the in-process JWKS) → 200. **No manual `curl`.**
- Audit log emission: assert injected `auditLog` spy is called once per mutation success with the expected `{ adminEmail, action, target }` shape.
- Idempotency: approve a user twice; second call returns `{ status: 'already-handled', firstTime: false }`, no DB write, no audit-log entry.
- Zod response validation: feed each route a malformed result; assert it returns 500 with `code: 'server-error'` (not a leaked partial response).
- DB state reset: each integration test owns a transaction or a fixed test-user UUID; `afterEach` deletes the test user from `users`, `board_waiting_users`, `user_board_permissions`. Notification triggers fire as expected during tests; the test user's writes are explicitly cleaned up.

### E2E Network Passthrough (Layer 3) — agent-browser + dev3000

Full UI flows against the dev server with real internal APIs (external services use local/test instances):
- Admin sign-in → dashboard loads (no flash of admin shell while `/api/admin/me` is in flight).
- User-approval page → boards list renders → waiting users render → approve a user → row disappears, audit log entry visible.
- Reject flow.
- Boards/[id] page renders.
- Posts page renders with week and all ranges.
- Settings page → board create + app-config update both work.
- Token expiry mid-session: simulate by clearing the in-memory token cache; next request triggers `getIdToken(true)`; flow completes.
- Second 401: simulate by also invalidating the refreshed token; UI redirects to sign-in.
- 429 hit: simulate by exhausting the rate limiter; UI shows "Too many requests — retry in 30s."
- 403 (non-admin): sign in with a Firebase account whose email is not in `ADMIN_EMAILS`; UI shows "Your account does not have admin access."

### E2E Local DB (Layer 4) — Supabase local Docker

DB-dependent scenarios:
- `service_role` correctly bypasses RLS for admin reads/writes (would fail if migration `20260301000000_reenable_rls.sql` were misapplied).
- `board_waiting_users` notification triggers fire correctly when approve/reject mutations write (per project memory: notification triggers must be handled when running against local Supabase).
- Migration prerequisite check: confirm all migrations applied before tests run; fail loudly otherwise.
- Idempotency under concurrency: fire two simultaneous approve calls for the same user; verify exactly one audit-log entry and exactly one permission row created (validates D6's atomic conditional delete).

### CI gating

| Test | Required to merge? |
|---|---|
| Unit (Layer 1) | Yes |
| Integration (Layer 2, supertest) | Yes |
| Negative auth tests (Layer 2) | Yes |
| Smoke-test of all 16 routes (Phase 1) | Yes |
| Module-load fail-closed (child process) | Yes |
| `grep` audits (service role key, ADMIN_EMAILS in client files) | Yes |
| E2E Layer 3 | Yes for the happy paths (sign-in → approve); flake-tolerant for token-expiry/429/403 |
| E2E Layer 4 (local Supabase Docker) | Yes for idempotency-under-concurrency; nightly is acceptable for the rest |

### Verification before merge (definition of done)

**Functional:**
- `https://admin.dailywritingfriends.com/admin` loads dashboard.
- `/admin/user-approval` loads boards + waiting users.
- Approve and reject mutations succeed (and are idempotent on retry).
- All other admin pages render and writes work.

**Security boundary:**
- `grep -r 'SUPABASE_SERVICE_ROLE_KEY' apps/admin/src/` returns only `lib/server/` files.
- `grep -rn 'ADMIN_EMAILS' apps/admin/src/ --include='*.tsx' --include='*.ts'` returns only `lib/server/`.
- `grep -rn "from '@/lib/supabase'" apps/admin/src/` returns nothing (Phase 3) — ESLint enforces earlier.
- Production browser DevTools bundle search: no service role key, no admin emails.
- Build fails when a `'use client'` file imports `lib/server/supabase.ts` (regression test).

**Operational:**
- Audit log entries appear in Vercel logs as parseable JSON for approve/reject/board-create/app-config-update.
- Rate limit returns 429 with `Retry-After` header after exceeding threshold.
- Upstash outage simulation → mutations return 503; reads still work.
