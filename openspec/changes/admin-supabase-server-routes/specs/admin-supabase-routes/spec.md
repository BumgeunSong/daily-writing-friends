## ADDED Requirements

### Requirement: Admin Supabase calls behind Next.js Route Handlers

All admin app reads and writes to Supabase SHALL go through Next.js Route Handlers under `apps/admin/src/app/api/admin/**`. No `'use client'` component, hook, or page file SHALL directly read `SUPABASE_SERVICE_ROLE_KEY`, instantiate a service-role Supabase client, or import from `@/lib/supabase`.

#### Scenario: Service role key absent from client bundle

- **WHEN** the production admin bundle is searched (DevTools → Sources → Search) for the literal value of `SUPABASE_SERVICE_ROLE_KEY`
- **THEN** the search SHALL return zero matches.

#### Scenario: Grep audit confirms server-only usage

- **WHEN** running `grep -r 'SUPABASE_SERVICE_ROLE_KEY' apps/admin/src/`
- **THEN** matches SHALL appear ONLY under `apps/admin/src/lib/server/`.

#### Scenario: Page rendering does not throw "missing key"

- **WHEN** an admin loads any page (`/admin`, `/admin/user-approval`, `/admin/boards`, `/admin/boards/[id]`, `/admin/users`, `/admin/posts`)
- **THEN** the page SHALL render without throwing `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`.

### Requirement: Read routes for boards, users, posts, app config

The admin app SHALL expose read routes for every Supabase data view currently used by admin pages. Each route SHALL require admin authentication via `requireAdmin` and SHALL use the server-only Supabase client.

#### Scenario: `GET /api/admin/boards` returns the board list

- **WHEN** an authenticated admin requests `GET /api/admin/boards`
- **THEN** the response SHALL be `200` with a JSON array of boards.

#### Scenario: `GET /api/admin/boards/[id]` returns a single board

- **WHEN** an authenticated admin requests `GET /api/admin/boards/[id]` with a valid board id
- **THEN** the response SHALL be `200` with the board object.

#### Scenario: `GET /api/admin/boards/last` returns the most recent board

- **WHEN** an authenticated admin requests `GET /api/admin/boards/last`
- **THEN** the response SHALL be `200` with the most recent board (used by `useCreateUpcomingBoard`).

#### Scenario: `GET /api/admin/boards/[id]/users` returns approved board users

- **WHEN** an authenticated admin requests `GET /api/admin/boards/[id]/users`
- **THEN** the response SHALL be `200` with the list of users currently approved for the board.

#### Scenario: `GET /api/admin/boards/[id]/waiting-users` returns waiting user IDs

- **WHEN** an authenticated admin requests `GET /api/admin/boards/[id]/waiting-users`
- **THEN** the response SHALL be `200` with the list of user IDs awaiting approval for the board.

#### Scenario: `GET /api/admin/users` returns all users

- **WHEN** an authenticated admin requests `GET /api/admin/users`
- **THEN** the response SHALL be `200` with the user list.

#### Scenario: `GET /api/admin/users/search?q=...` returns matching users

- **WHEN** an authenticated admin requests `GET /api/admin/users/search?q=foo`
- **THEN** the response SHALL be `200` with users whose name or email matches the query.

#### Scenario: `POST /api/admin/users/by-ids` returns users by ID list

- **WHEN** an authenticated admin sends `POST /api/admin/users/by-ids` with body `{ ids: string[] }`
- **THEN** the response SHALL be `200` with the corresponding user objects. This route is treated as a READ for rate-limit and audit-log purposes despite the POST verb.

#### Scenario: `GET /api/admin/users/[id]/previous-cohort-posts?cohort=N` returns count

- **WHEN** an authenticated admin requests `GET /api/admin/users/[id]/previous-cohort-posts?cohort=N`
- **THEN** the response SHALL be `200` with the user's post count from cohort N.

#### Scenario: `GET /api/admin/posts?boardId=X&range=week|all` returns posts

- **WHEN** an authenticated admin requests `GET /api/admin/posts?boardId=X&range=week`
- **THEN** the response SHALL be `200` with posts for the given board within the requested range.

#### Scenario: `GET /api/admin/app-config` returns the current app config

- **WHEN** an authenticated admin requests `GET /api/admin/app-config`
- **THEN** the response SHALL be `200` with the app config document.

### Requirement: Mutation routes for approve, reject, board create, app config update

The admin app SHALL expose mutation routes for every Supabase write currently used by admin pages and hooks. Each mutation route SHALL require admin authentication, SHALL be subject to per-admin-email rate limiting, and SHALL emit a structured audit log entry on success.

#### Scenario: `POST /api/admin/users/approve` approves a waiting user

- **WHEN** an authenticated admin sends `POST /api/admin/users/approve` with body `{ userId, boardId }` for a user currently in `board_waiting_users` for that board
- **THEN** the response SHALL be `200`, the user SHALL be removed from `board_waiting_users`, the user SHALL be granted permission for the board, and an audit log entry with `action: "user.approve"` SHALL be emitted.

#### Scenario: `POST /api/admin/users/reject` rejects a waiting user

- **WHEN** an authenticated admin sends `POST /api/admin/users/reject` with body `{ userId, boardId }` for a user currently in `board_waiting_users` for that board
- **THEN** the response SHALL be `200`, the user SHALL be removed from `board_waiting_users` (or marked rejected per existing schema), and an audit log entry with `action: "user.reject"` SHALL be emitted.

#### Scenario: `POST /api/admin/boards` creates a new board

- **WHEN** an authenticated admin sends `POST /api/admin/boards` with a valid board payload
- **THEN** the response SHALL be `200` with the created board, and an audit log entry with `action: "board.create"` SHALL be emitted.

#### Scenario: `POST /api/admin/app-config` updates app config

- **WHEN** an authenticated admin sends `POST /api/admin/app-config` with a valid config payload
- **THEN** the response SHALL be `200`, the config SHALL be updated, and an audit log entry with `action: "app-config.update"` SHALL be emitted.

### Requirement: Canonical HTTP contract types and runtime validation

Every admin route SHALL have its request and response shapes defined in `apps/admin/src/types/admin-api-contracts.ts`. Date fields in response shapes SHALL be `string` (ISO-8601), not `Date`. Each route response SHALL be validated through a Zod schema before `NextResponse.json()`.

#### Scenario: Date fields are strings

- **WHEN** a route returns a board whose `created_at`/`first_day`/`last_day` fields are populated
- **THEN** the JSON response SHALL contain those fields as ISO-8601 strings, and the contract type SHALL declare them as `string`.

#### Scenario: Zod rejects malformed response and returns 500

- **WHEN** a route handler accidentally constructs a response object missing a required field or with a wrong-typed field
- **THEN** the Zod validation SHALL fail and the route SHALL respond `500` with `{ error: string, code: "server-error" }`, not the malformed body.

#### Scenario: Canonical error envelope

- **WHEN** any admin route fails with 401, 403, 429, 400, or 500
- **THEN** the response body SHALL match `{ error: string, code: "unauthorized" | "forbidden" | "rate-limited" | "bad-request" | "server-error" }`.

### Requirement: Generated Supabase database row types

The Supabase row types used by admin routes and pages SHALL be generated via `supabase gen types typescript` and committed to a shared location (e.g., `supabase/types/database.ts`). Hand-written row types in `apps/admin/src/apis/supabase-reads.ts` SHALL be removed in Phase 3.

#### Scenario: Generated types file exists and is referenced

- **WHEN** the admin app builds
- **THEN** the build SHALL import row types from the generated `supabase/types/database.ts` rather than hand-written `SupabaseBoard`/`SupabaseUser`/`SupabasePost` interfaces.

### Requirement: Pages migrated off direct Supabase client usage

Every admin page and hook currently importing `getSupabaseClient` or `supabase-reads` SHALL be migrated to use the new `apis/admin-api.ts` client wrappers and React Query keys defined in `adminQueryKeys`.

#### Scenario: No client-side Supabase imports remain in pages

- **WHEN** running `grep -rn 'supabase-reads\|getSupabaseClient' apps/admin/src/app/`
- **THEN** the search SHALL return zero matches after Phase 1.

#### Scenario: Dashboard uses `/api/admin/me` instead of hardcoded set

- **WHEN** an admin loads `/admin`
- **THEN** the page SHALL call `GET /api/admin/me`, render a loading skeleton until the response resolves, and route accordingly. The bundled JavaScript SHALL NOT contain any admin email literal.

### Requirement: Phase 3 cleanup and old-path removal

After Phase 2 hardening, the admin app SHALL delete `apps/admin/src/lib/supabase.ts` and `apps/admin/src/apis/supabase-reads.ts`, and SHALL remove `NEXT_PUBLIC_SUPABASE_URL` from the admin Vercel env. The ESLint rule banning `from '@/lib/supabase'` SHALL remain in place to prevent re-introduction.

#### Scenario: Old files are gone

- **WHEN** Phase 3 ships
- **THEN** `apps/admin/src/lib/supabase.ts` and `apps/admin/src/apis/supabase-reads.ts` SHALL NOT exist.

#### Scenario: `NEXT_PUBLIC_SUPABASE_URL` removed from admin env

- **WHEN** Phase 3 ships
- **THEN** `NEXT_PUBLIC_SUPABASE_URL` SHALL NOT appear in `apps/admin/`'s Vercel project environment variables.
