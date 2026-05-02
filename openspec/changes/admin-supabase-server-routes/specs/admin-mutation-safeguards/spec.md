## ADDED Requirements

### Requirement: Structured audit logging for every mutation

Every admin mutation route SHALL emit a single structured JSON log entry on success via a shared `auditLog` helper. The entry SHALL include `timestamp` (ISO-8601), `adminEmail` (sanitized), `action` (typed enum), and `target` (route-specific identifier, preferring user UUIDs over emails). The helper SHALL emit exactly one parseable line per call.

#### Scenario: Approve emits one structured entry

- **WHEN** an authenticated admin successfully approves a user via `POST /api/admin/users/approve`
- **THEN** exactly one log line of valid JSON SHALL be emitted with shape `{ "timestamp": "<ISO>", "adminEmail": "<email>", "action": "user.approve", "target": "<userId>" }`.

#### Scenario: Reject emits one structured entry

- **WHEN** an authenticated admin successfully rejects a user via `POST /api/admin/users/reject`
- **THEN** exactly one JSON log line SHALL be emitted with `action: "user.reject"`.

#### Scenario: Board create emits one structured entry

- **WHEN** an authenticated admin successfully creates a board via `POST /api/admin/boards`
- **THEN** exactly one JSON log line SHALL be emitted with `action: "board.create"` and `target` containing the new board id.

#### Scenario: App-config update emits one structured entry

- **WHEN** an authenticated admin successfully updates app config via `POST /api/admin/app-config`
- **THEN** exactly one JSON log line SHALL be emitted with `action: "app-config.update"`.

#### Scenario: Failed mutations do NOT emit an audit entry

- **WHEN** a mutation fails (validation error, rate limit, Supabase error)
- **THEN** NO audit log entry SHALL be emitted.

#### Scenario: Action is a typed enum

- **WHEN** the `auditLog` helper is invoked
- **THEN** the `action` parameter SHALL be one of `"user.approve" | "user.reject" | "board.create" | "app-config.update"` (TypeScript enforcement) and adding a new mutation route without extending this union SHALL fail compilation.

### Requirement: Audit log sanitization against log injection

The `auditLog` helper SHALL strip ASCII control characters (`\x00-\x1F` and `\x7F`) from string fields before emitting, to prevent log injection via newlines, tabs, or ANSI escape sequences embedded in admin email or target values.

#### Scenario: Newlines in email are stripped

- **WHEN** `auditLog` is called with `adminEmail = "admin@example.com\nINJECTED-FAKE-LINE"`
- **THEN** the emitted line SHALL contain the email with the newline removed (no second log line is forged).

#### Scenario: ANSI escapes in target are stripped

- **WHEN** `auditLog` is called with a string field containing `\x1B[31m` (ANSI red)
- **THEN** the emitted line SHALL not contain the escape sequence.

### Requirement: PII minimization in audit log targets

When the target of an admin action is a user, the audit log `target` field SHALL contain the user's UUID, not their email address.

#### Scenario: Approve logs user UUID, not email

- **WHEN** an admin approves user with id `uuid-123` and email `joe@example.com`
- **THEN** the audit log entry's `target` SHALL be `"uuid-123"` (or an object containing `userId: "uuid-123"`), and SHALL NOT contain `"joe@example.com"`.

### Requirement: Per-admin-email rate limiting on mutations

Every admin mutation route SHALL be rate-limited per admin email at a documented threshold (default: 60 requests per 60 seconds). Rate-limit gating SHALL be based on route intent (mutation vs read), NOT HTTP verb. Read routes SHALL NOT be rate-limited even when they use the POST verb (e.g., `POST /api/admin/users/by-ids`).

#### Scenario: Mutation under threshold succeeds

- **WHEN** an authenticated admin makes mutations at a rate below the threshold
- **THEN** all requests SHALL succeed and audit log entries SHALL be emitted normally.

#### Scenario: Mutation over threshold returns 429 with `Retry-After`

- **WHEN** an authenticated admin exceeds the per-email mutation threshold within the window
- **THEN** the route SHALL respond `429` with body `{ error: string, code: "rate-limited" }` and the response SHALL include a `Retry-After: <seconds>` header.

#### Scenario: Read-via-POST is NOT rate-limited

- **WHEN** an authenticated admin makes many requests to `POST /api/admin/users/by-ids`
- **THEN** the route SHALL NOT apply mutation rate-limit gating.

#### Scenario: Per-admin-email isolation

- **WHEN** admin A exhausts their mutation rate limit
- **THEN** admin B's mutation requests SHALL still succeed (separate per-email counters).

### Requirement: Idempotent state-transition mutations via atomic conditional updates

`POST /api/admin/users/approve` and `POST /api/admin/users/reject` SHALL be idempotent at the database layer. The implementation SHALL use an atomic conditional `DELETE ... RETURNING` (or equivalent atomic Postgres construct) to ensure that concurrent or retried calls produce exactly one state transition, exactly one permission/state row change, and exactly one audit log entry.

#### Scenario: Second sequential approve is a no-op

- **WHEN** admin approves user X for board Y, then immediately calls `POST /api/admin/users/approve` again with the same `{ userId: X, boardId: Y }`
- **THEN** the second response SHALL be `200` with body indicating the action was already handled, NO additional database write SHALL occur, and NO additional audit log entry SHALL be emitted.

#### Scenario: Concurrent approve calls produce one transition

- **WHEN** two simultaneous `POST /api/admin/users/approve` calls are issued for the same `{ userId, boardId }`
- **THEN** exactly one call SHALL successfully delete the waiting row and emit the audit log; the other SHALL detect "already handled" and exit cleanly without duplicating state.

#### Scenario: Reject is idempotent

- **WHEN** admin rejects user X for board Y, then retries the same call
- **THEN** the same idempotency guarantees apply as for approve.

### Requirement: Rate limiter fails closed on backend outage

If the rate-limit backend (Upstash) is unreachable or returns an error, mutation routes SHALL respond `503 Service Unavailable` rather than allowing the mutation through. Read routes SHALL be unaffected.

#### Scenario: Upstash outage halts mutations

- **WHEN** the rate limiter throws or times out for a mutation route
- **THEN** the route SHALL respond `503` with body `{ error: string, code: "server-error" }`.

#### Scenario: Upstash outage does not affect reads

- **WHEN** the rate limiter is unreachable
- **THEN** read routes SHALL continue to respond normally.

### Requirement: Higher-order `withAdmin` wrapper applied to every route

Every route handler under `apps/admin/src/app/api/admin/**` SHALL be defined via a shared `withAdmin(kind, action, handler)` higher-order function. The wrapper SHALL invoke `requireAdmin`, apply rate limiting (when `kind === 'mutation'`), call the handler, validate the response via Zod, and emit the audit log on mutation success. Routes SHALL NOT call `requireAdmin` directly nor implement audit/rate-limit logic inline.

#### Scenario: Every route file uses `withAdmin`

- **WHEN** running `grep -rL "withAdmin" apps/admin/src/app/api/admin/`
- **THEN** the search SHALL return zero `route.ts` files (every route file uses the wrapper).

#### Scenario: Routes without `requireAdmin` are structurally impossible

- **WHEN** a developer writes a new route that bypasses `withAdmin` and calls Supabase directly
- **THEN** code review SHALL reject it; runtime smoke tests SHALL detect the missing 401 on the unauthenticated negative test.

### Requirement: CI smoke test for all admin routes before deploy

Before any Phase 1+ deploy of the admin app to production, CI SHALL execute a smoke test that calls every route under `/api/admin/**` with a valid test admin token (or test-time-injected `requireAdmin`) and asserts each returns `200` with a valid response shape. CI SHALL also assert that each route returns `401` without an Authorization header and `403` with a non-admin token.

#### Scenario: Smoke test gates merge

- **WHEN** a PR modifies any file under `apps/admin/src/app/api/admin/**` or `apps/admin/src/lib/server/**`
- **THEN** CI SHALL run the smoke test and merge SHALL be blocked if any route returns non-200 with the test admin token, or if any route returns non-401 without a token, or if any route returns non-403 with a non-admin token.
