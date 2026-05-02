## Review Summary

**Status**: Ready (after Round 2 revisions). All Critical findings closed in design.md; Important findings either resolved or documented as accepted trade-offs.
**Iteration**: 2 of max 2

## Architecture

The two-layer guard (`import 'server-only'` + ESLint rule banning `from '@/lib/supabase'`) is sound. The `lib/server/*` subdirectory is a clean way to mark the server boundary against the existing flat `lib/` layout.

**Issue raised**: `types/admin-api.ts` would collide with the legacy entity-model conventions in `types/firestore.ts` and `types/userAgent.ts`. Mixing HTTP request/response shapes with entity shapes blurs "what the DB returns" vs "what the HTTP API returns."
- **Resolution (Round 2)**: renamed to `types/admin-api-contracts.ts` and explicitly scoped to HTTP-layer types. Generated DB row types (new `supabase/types/database.ts`) handle entity shapes.

**Issue raised**: hand-written row types in `apis/supabase-reads.ts` are drift-prone; no generated DB types exist anywhere in the monorepo.
- **Resolution (Round 2)**: Phase 0 adds a `supabase gen types typescript` step and commits the output to `supabase/types/database.ts`. One-time fix; eliminates an entire class of column-rename drift bugs.

**Issue raised**: 16 routes with copy-pasted `requireAdmin + audit + rate-limit` boilerplate is the exact bug class this migration exists to prevent (a single missed call = silent auth bypass).
- **Resolution (Round 2)**: introduced `withAdmin(kind, action, handler)` higher-order wrapper. Routes contain only query logic; auth/audit/rate-limit applied uniformly. Missing `requireAdmin` becomes structurally impossible.

**Issue raised**: Long-horizon evolvability (Supabase Auth migration path).
- **Verdict**: the existing `requireAdmin` interface is the right abstraction — swapping `verify-token.ts` internals migrates all 16 routes uniformly. Acceptable.

## Security

**Issue raised (Critical, OWASP A02/A07)**: JWT algorithm not pinned. Without `algorithms: ['RS256']`, `jose.jwtVerify` may accept `alg: none` or HS256-using-public-key (classic JWT alg-substitution attack).
- **Resolution (Round 2)**: D2 now mandates the exact `jwtVerify` options: `{ issuer, audience, algorithms: ['RS256'], clockTolerance: 30 }`. Implementation must use these literally.

**Issue raised**: allowlist parsing whitespace, comma-only, and case-sensitivity gaps. `ADMIN_EMAILS=" , , "` could parse to `["", ""]` and pass the "non-empty" check while matching empty email claims.
- **Resolution (Round 2)**: D3 specifies the exact parsing pipeline (split → trim → lowercase → filter empty → throw if empty). Email comparison is case-folded on both sides. CI tests three pathological inputs (`""`, `"   "`, `","`) in child processes.

**Issue raised**: `/api/admin/me` is an admin-status discovery oracle.
- **Disposition**: Accepted as documented trade-off. The endpoint's purpose requires telling the caller whether they are admin; the alternative (403 for non-admin) leaks the same information via status code. Documented in D10 and Risks.

**Issue raised**: stolen 1h Firebase token blast radius = 60 mut/min × 60min = 3600 service_role mutations. Effectively unbounded damage at app scale.
- **Disposition**: Compensating controls (audit log + manual `ADMIN_EMAILS` rotation as fast killswitch) accepted. Trade-off explicitly documented; lower mutation rate revisited if telemetry shows anomalous volume from one email post-launch.

**Issue raised**: audit log PII (user emails) and log injection via control characters.
- **Resolution (Round 2)**: D5 specifies `target` should be a user UUID, not email. `sanitize()` strips control chars from `adminEmail` before logging. JSON.stringify ensures parseable output.

**Issue raised**: bundle audit for `ADMIN_EMAILS` not specified.
- **Resolution (Round 2)**: Phase 2 CI grep added: `grep -rn 'ADMIN_EMAILS' apps/admin/src/ --include='*.tsx' --include='*.ts'` returns only `lib/server/`.

**Issue raised**: rate limiter fail-closed on Upstash outage = intentional DoS vector.
- **Disposition**: Accepted. Upstash outage halts mutations only (reads still work); admin emergency bypass is rotating `ADMIN_EMAILS` to instantly invalidate stolen tokens. Documented in Risks.

**Confirmed clean**: CSRF (Bearer header), SSRF (hardcoded JWKS URL), SQL injection (Supabase client parameterizes).

## Quality & Performance

**Issue raised (Critical)**: D6 idempotency was underspecified — naive SELECT-then-UPDATE is not atomic in Supabase JS, allowing two simultaneous approve calls to both write.
- **Resolution (Round 2)**: D6 now specifies an atomic `DELETE ... RETURNING` pattern. Concurrent second call sees zero rows and exits cleanly. Layer 4 E2E test covers the under-concurrency case.

**Issue raised (Critical)**: `console.log` of an object emits `[object Object]`; even `JSON.stringify` produces a flat string Vercel indexes poorly. The "forensics" value of D5 was illusory as written.
- **Resolution (Round 2)**: D5 now specifies an `auditLog()` helper that does `console.log(JSON.stringify({...}))`. `action` is a typed enum (`'user.approve' | 'user.reject' | ...`) so log queries are stable. The helper is injectable for tests.

**Issue raised**: Type drift without runtime validation. TypeScript structural typing won't catch a route returning `{ ...expected, internalSecret: '...' }`.
- **Resolution (Round 2)**: D8 adds Zod schema validation per route response, run before `NextResponse.json()`. ~2 lines per route. Catches extra-field leaks at runtime.

**Issue raised**: `getIdToken` round-trip on every stale page load (no proactive expiry check).
- **Resolution (Round 2)**: D7 specifies proactive refresh when `exp - now < 30s`, before sending the request. Eliminates the always-pay-the-401 round-trip on stale tokens.

**Issue raised**: rate-limit "retry shortly" is vague.
- **Resolution (Round 2)**: 429 response includes `Retry-After: <seconds>` header; client surfaces "Retry in Ns" with concrete value.

**Issue raised**: Phase 1 PR size + risk of one quietly-broken route slipping through.
- **Resolution (Round 2)**: CI smoke-test gates Phase 1 deploy: hit every route with a valid admin token, assert 200. Listed as "required to merge."

## Testability

**Issue raised (Critical)**: `jose`'s module-level JWKS cache cannot be invalidated between tests; module-load fail-closed test cannot run inside the same Vitest worker (module cache prevents observing throws after first load); Firebase ID token generation in CI has no solution.
- **Resolution (Round 2)**:
  - `verify-token.ts` exports a `createVerifier({ jwksUrl, projectId })` factory; tests substitute a local in-process JWKS with a generated key pair. Cache is per-factory-instance, not module-level.
  - Module-load tests run in child processes (`execa`) with poisoned env, asserting the import throws.
  - CI integration tests use the in-process JWKS to mint pre-signed JWTs for a fixed test admin email — no Firebase Auth Emulator dependency.

**Issue raised**: audit log assertability via `vi.spyOn(console, 'log')` is fragile.
- **Resolution (Round 2)**: D5's `auditLog` helper is injected into routes via `withAdmin`'s closure; tests provide a spy implementation directly.

**Issue raised**: negative auth tests listed as `curl` commands but not automated.
- **Resolution (Round 2)**: Phase 2 specifies `supertest`-based integration tests for all four negative cases against route handlers, gated as required-to-merge.

**Issue raised**: local DB state reset between integration tests not specified.
- **Resolution (Round 2)**: Layer 2 testability notes specify `afterEach` cleanup of test user UUID across `users`, `board_waiting_users`, `user_board_permissions`. Notification triggers fire normally; cleanup is explicit.

**Issue raised**: CI gating not specified per-layer.
- **Resolution (Round 2)**: explicit table mapping each layer/test type to "required to merge" vs "nightly OK."

## API & Integration

**Issue raised (Critical)**: response shape mismatch — `mapToBoard` returns `Date` objects; `JSON.stringify` converts to strings; `Board` typed as `Date | Timestamp` will mismatch HTTP reality.
- **Resolution (Round 2)**: D8 explicitly specifies all date fields in `admin-api-contracts.ts` are `string` (ISO-8601). Pages doing `instanceof Date` checks (or implicit Date arithmetic) updated during Phase 1.

**Issue raised (Critical)**: approve/reject mutations don't exist in `supabase-reads.ts` — they are inline calls in `user-approval/page.tsx:143-216`. Design's "wrap one-to-one" framing was misleading for mutations.
- **Resolution (Round 2)**: D9 explicitly notes that approve/reject route handlers are new code (not wrappers); they replicate the page's inline logic with the D6 idempotency guarantee.

**Issue raised**: no canonical error response shape.
- **Resolution (Round 2)**: D7 defines `AdminApiError = { error: string; code: 'unauthorized' | 'forbidden' | 'rate-limited' | 'bad-request' | 'server-error' }`. Every route uses it.

**Issue raised**: query keys ad-hoc strings across pages → cache invalidation drift.
- **Resolution (Round 2)**: D12 specifies `adminQueryKeys` map in `apis/admin-api.ts`; pages import from there.

**Issue raised**: audit log `action` and `target` lack a contract.
- **Resolution (Round 2)**: D5's `AdminAction` is a typed union; `target` shape is route-specific but documented per-route.

**Issue raised**: `Board.waitingUsersIds` is vestigial (always `[]`).
- **Resolution (Round 2)**: D8 drops it from the HTTP contract. Pages still compiling on the old type continue to work because absent and `[]` behave identically at use sites.

**Confirmed clean**: no naming conflicts in `app/api/` (no existing routes), Phase 3 deletion impact contained to admin app (no imports from `apps/web/` or `functions/`).

## Consolidated Findings

### Critical (all resolved in Round 2)

1. **JWT algorithm not pinned** → D2 mandates `algorithms: ['RS256']` + `clockTolerance: 30`.
2. **Idempotency race in D6** → atomic `DELETE ... RETURNING` pattern.
3. **Audit log unstructured** → `auditLog()` helper with JSON.stringify + sanitization + typed action enum.
4. **Response Date serialization mismatch** → contracts specify `string` (ISO-8601) for all date fields.
5. **Approve/reject not wrappers, are new code** → D9 clarified.
6. **No generated Supabase types** → Phase 0 task added.
7. **JWKS cache + module-load test isolation** → factory pattern + child-process tests.

### Important (all resolved or documented)

- Allowlist parsing robustness (whitespace, case) → D3 explicit pipeline.
- `withAdmin` higher-order wrapper to eliminate boilerplate → D4.
- Zod runtime validation → D8.
- Proactive token refresh → D7.
- `Retry-After` header → D7.
- Bundle audit for `ADMIN_EMAILS` → Phase 2 grep.
- Audit log PII + injection → D5 sanitization + UUID targets.
- `types/admin-api-contracts.ts` naming → D8.
- Query keys map → D12.
- Canonical error shape → D7.
- Negative auth tests automated via supertest → testability notes.
- DB state reset strategy → testability notes.
- CI gating table → testability notes.
- Phase 1 smoke-test → migration plan.
- Audit log assertability via injection → D5.

### Minor (accepted as-is)

- `/api/admin/me` discovery oracle → accepted, documented (D10).
- Rate limiter fail-closed = DoS vector during Upstash outage → accepted, documented (Risks).
- Stolen-token blast radius = 3600 mutations/h → compensating controls accepted, documented (Risks).
- `POST /api/admin/users/by-ids` POST-as-read → documented as intentional with rate-limit exemption based on intent metadata.
- Open Questions (Vercel log retention, rate-limit threshold tuning, mutation rate vs read rate) → working assumptions stated, revisit triggers documented.
- Rollback floor is "currently broken state" → accepted; CI smoke-test gate makes Phase 1 deploy of broken code unlikely.

## Accepted Trade-offs

- **Throwaway JWT verification layer (~150–200 lines)**: paid in exchange for deferring Supabase Auth migration. Mechanical replacement during eventual migration.
- **Upstash dependency**: paid in exchange for proactive abuse detection across 16 endpoints surviving serverless cold-starts. Free tier sufficient at 2-admin scale.
- **Information disclosure via `/api/admin/me`**: fundamental to the endpoint's purpose; accepted at scale.
- **Stolen-token 1h blast radius**: bounded by audit log + rate limit + manual rotation; sub-1h revocation requires Firebase backend infrastructure not in scope.
- **Phase 1 PR size**: large, but bundling is the right call (page rewrites cannot deploy without routes); CI smoke-test mitigates the "one quiet broken route" risk.

## Revision History

- **Round 1 (2026-05-02)**: Five reviewers (architecture, security, quality, testability, integration) raised 7 Critical and ~25 Important findings. Critical: JWT alg pinning, idempotency race, audit log structure, response Date serialization, approve/reject not wrappers, missing generated DB types, test isolation problems.
- **Round 2 (2026-05-02)**: Design rewritten. New decisions: D11 (generated Supabase types), D12 (query keys map), `withAdmin` wrapper (D4), explicit Zod validation (D8), atomic conditional updates (D6), structured audit log helper with typed actions and sanitization (D5), pinned JWT algorithm and explicit clock tolerance (D2), robust allowlist parsing (D3), HTTP-contract type file separated from entity types (D8). Testability notes reorganized into clear CI gating table. Phase 0 expanded with `supabase gen types`. Phase 2 expanded with `supertest`-based negative auth tests and additional grep audits. All Critical findings closed; Important findings either resolved or explicitly documented as accepted.
