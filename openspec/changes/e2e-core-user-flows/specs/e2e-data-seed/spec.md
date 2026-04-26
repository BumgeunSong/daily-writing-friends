## ADDED Requirements

### Requirement: Domain seed script

`scripts/seed-e2e-domain.ts` SHALL seed domain data for E2E tests. The script SHALL read user IDs from `tests/fixtures/e2e-users.json` and validate they exist before inserting domain data. The script SHALL use the `service_role` key to bypass RLS. All inserts SHALL use upsert semantics (`ON CONFLICT DO NOTHING` or equivalent) for idempotency.

#### Scenario: Successful domain seeding
- **WHEN** `seed-e2e-domain.ts` runs after `seed-e2e-users.ts` has completed
- **THEN** the following data SHALL exist in the local Supabase:
  - 1 board (`e2e-test-board`)
  - `user_board_permissions` for e2e@ user (write permission)
  - No `user_board_permissions` for e2e2@ user
  - `PAGE_SIZE + 5` posts authored by e2e@ user, with `created_at` values spread over relative dates
  - 7 posts with `created_at` on consecutive days ending today (for streak verification)
  - 2 comments on existing posts
  - Output written to `tests/fixtures/e2e-domain.json`

#### Scenario: Missing user IDs
- **WHEN** `tests/fixtures/e2e-users.json` does not exist or contains invalid user IDs
- **THEN** the script SHALL fail with a descriptive error and exit code 1

#### Scenario: Repeated execution
- **WHEN** the script runs multiple times
- **THEN** the database state SHALL be identical to a single run (idempotent)

### Requirement: Localhost runtime guard

The seed script SHALL verify that `SUPABASE_URL` contains `127.0.0.1` or `localhost` before executing any database operations.

#### Scenario: Non-local Supabase URL
- **WHEN** `SUPABASE_URL` does not contain `127.0.0.1` or `localhost`
- **THEN** the script SHALL immediately fail with a clear error message and exit code 1

### Requirement: Global setup integration

`tests/global-setup.ts` SHALL call the domain seed after the user seed. Domain seed failure SHALL be treated as fatal.

#### Scenario: Domain seed called in sequence
- **WHEN** global setup runs
- **THEN** `seedUsers()` SHALL complete before `seedDomain()` starts

#### Scenario: Domain seed failure
- **WHEN** domain seed fails
- **THEN** global setup SHALL fail and no Playwright tests SHALL run
