## ADDED Requirements

### Requirement: Server-side Firebase ID token verification

The admin app SHALL verify Firebase ID tokens server-side using Google's public JWKS, with the JWT signing algorithm pinned to `RS256` and standard claims (`iss`, `aud`, `exp`) validated explicitly. The verifier MUST NOT use the `firebase-admin` SDK and MUST NOT require a Firebase service account private key.

#### Scenario: Valid admin token is accepted

- **WHEN** a request arrives with `Authorization: Bearer <token>` where `<token>` is a valid Firebase ID token signed with `RS256`, `iss = https://securetoken.google.com/${FIREBASE_PROJECT_ID}`, `aud = ${FIREBASE_PROJECT_ID}`, `exp` in the future, and `email` claim present
- **THEN** the verifier SHALL return the decoded claims (including the email) and the request SHALL proceed.

#### Scenario: Token signed with `alg: none` is rejected

- **WHEN** a request arrives with a token whose JWT header sets `alg: none`
- **THEN** the verifier SHALL reject the token and the route SHALL respond `401 Unauthorized`.

#### Scenario: Token signed with `alg: HS256` using JWKS public key is rejected

- **WHEN** a request arrives with a token forged via the `alg: HS256` substitution attack (HMAC using the public RSA key as secret)
- **THEN** the verifier SHALL reject the token because `RS256` is the only accepted algorithm and the route SHALL respond `401 Unauthorized`.

#### Scenario: Expired token is rejected

- **WHEN** a request arrives with a token whose `exp` is in the past (beyond the 30-second clock tolerance)
- **THEN** the verifier SHALL reject the token and the route SHALL respond `401 Unauthorized`.

#### Scenario: Token with wrong issuer is rejected

- **WHEN** a request arrives with a token whose `iss` does not match `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
- **THEN** the verifier SHALL reject the token and the route SHALL respond `401 Unauthorized`.

#### Scenario: Token with wrong audience is rejected

- **WHEN** a request arrives with a token whose `aud` does not match `${FIREBASE_PROJECT_ID}`
- **THEN** the verifier SHALL reject the token and the route SHALL respond `401 Unauthorized`.

#### Scenario: Garbage token is rejected

- **WHEN** a request arrives with `Authorization: Bearer garbage-not-a-jwt`
- **THEN** the verifier SHALL reject the token and the route SHALL respond `401 Unauthorized`.

#### Scenario: Missing Authorization header

- **WHEN** a request arrives without an `Authorization` header
- **THEN** the route SHALL respond `401 Unauthorized` without invoking Supabase.

### Requirement: Admin allowlist enforcement (`requireAdmin`)

The admin routes SHALL enforce an `ADMIN_EMAILS` allowlist that fails closed on misconfiguration. The allowlist parsing MUST be robust against whitespace, empty entries, and case differences.

#### Scenario: Allowlist parsing handles trim, empty entries, and case

- **WHEN** the module loads with `ADMIN_EMAILS=" Foo@Bar.com , , bob@example.com "`
- **THEN** the parsed allowlist SHALL be `["foo@bar.com", "bob@example.com"]` (trimmed, lowercased, empty entries dropped).

#### Scenario: Empty allowlist throws at module load

- **WHEN** the auth module is imported with `ADMIN_EMAILS=""`, `ADMIN_EMAILS="   "`, `ADMIN_EMAILS=","`, or `ADMIN_EMAILS=" , , "`
- **THEN** the module SHALL throw an error at import time and route handlers SHALL refuse to start.

#### Scenario: Missing allowlist throws at module load

- **WHEN** the auth module is imported with `ADMIN_EMAILS` unset
- **THEN** the module SHALL throw an error at import time.

#### Scenario: Email-claim case-insensitive match against allowlist

- **WHEN** a verified token has `email = "FOO@BAR.COM"` and the allowlist contains `"foo@bar.com"`
- **THEN** `requireAdmin` SHALL accept the request as admin.

#### Scenario: Email not in allowlist receives 403

- **WHEN** a request arrives with a valid Firebase ID token whose email is not in `ADMIN_EMAILS`
- **THEN** the route SHALL respond `403 Forbidden` with body `{ error: "...", code: "forbidden" }`.

#### Scenario: Empty or whitespace email claim is rejected

- **WHEN** a verified token has no `email` claim, or the claim is the empty string, or the claim is whitespace-only
- **THEN** `requireAdmin` SHALL reject the request and the route SHALL respond `401 Unauthorized`.

### Requirement: Distinct 401 vs 403 responses

The admin routes SHALL distinguish between authentication failures (401) and authorization failures (403). Clients SHALL be able to differentiate these to surface distinct user-facing messages.

#### Scenario: 401 response shape

- **WHEN** any authentication failure occurs (missing/invalid/expired/wrong-alg token, empty email claim)
- **THEN** the response SHALL be `401` with body `{ error: string, code: "unauthorized" }`.

#### Scenario: 403 response shape

- **WHEN** authentication succeeds but the email is not on the allowlist
- **THEN** the response SHALL be `403` with body `{ error: string, code: "forbidden" }`.

### Requirement: `GET /api/admin/me` admin-status check

The admin app SHALL expose `GET /api/admin/me` returning `{ isAdmin: boolean }` for client-side route gating. The route SHALL NOT include the email or any other claim values in the response, and SHALL NOT leak the contents of the `ADMIN_EMAILS` allowlist.

#### Scenario: Admin user gets `isAdmin: true`

- **WHEN** a verified token whose email is in the allowlist calls `GET /api/admin/me`
- **THEN** the response SHALL be `200 { isAdmin: true }`.

#### Scenario: Non-admin authenticated user gets `isAdmin: false`

- **WHEN** a verified token whose email is NOT in the allowlist calls `GET /api/admin/me`
- **THEN** the response SHALL be `200 { isAdmin: false }` (NOT `403`).

#### Scenario: Unauthenticated request rejected

- **WHEN** a request to `GET /api/admin/me` arrives without a valid Authorization header
- **THEN** the response SHALL be `401`.

### Requirement: Client-side authed fetch with proactive refresh and retry

The admin app SHALL provide an `api-client.ts` wrapper that attaches the Firebase ID token, proactively refreshes near-expiry tokens, retries once on 401, and surfaces typed errors for 401/403/429.

#### Scenario: Proactive refresh near expiry

- **WHEN** the cached Firebase ID token's `exp` is within 30 seconds of now and the client makes a request
- **THEN** the client SHALL call `getIdToken(true)` BEFORE sending, and attach the refreshed token.

#### Scenario: One retry on 401

- **WHEN** a request returns `401`
- **THEN** the client SHALL call `getIdToken(true)`, retry the request once with the refreshed token, and return the retry's response.

#### Scenario: Second 401 redirects to sign-in

- **WHEN** the retry after the first 401 also returns `401`
- **THEN** the client SHALL redirect the browser to the admin sign-in route.

#### Scenario: 403 surfaces a typed `AdminAccessError`

- **WHEN** any request returns `403`
- **THEN** the client SHALL throw an `AdminAccessError` whose message is "Your account does not have admin access."

#### Scenario: 429 surfaces a typed `RateLimitError`

- **WHEN** any request returns `429` with `Retry-After: <n>` header
- **THEN** the client SHALL throw a `RateLimitError` carrying `retryAfterSeconds = n`, which the calling component renders as `Too many requests — retry in ${n}s.`

### Requirement: Server-only Supabase client guard

The server-only Supabase client (`lib/server/supabase.ts`) SHALL include `import 'server-only'` as its first line. The build SHALL fail if any client component imports this module. An ESLint rule SHALL additionally ban imports from the legacy path `@/lib/supabase` anywhere in `apps/admin/src/`.

#### Scenario: Build fails on client-component import

- **WHEN** any file containing `'use client'` imports from `@/lib/server/supabase`
- **THEN** `next build` SHALL fail with the `server-only` error.

#### Scenario: ESLint blocks the legacy import path

- **WHEN** any file in `apps/admin/src/` adds `import { ... } from '@/lib/supabase'`
- **THEN** ESLint SHALL fail with a rule violation.
