## ADDED Requirements

### Requirement: CI Playwright workflow

`.github/workflows/run-playwright.yml` SHALL run Playwright E2E tests against a local Supabase instance in GitHub Actions.

#### Scenario: Successful CI E2E run
- **WHEN** a PR is opened or updated
- **THEN** the workflow SHALL:
  1. Install Node.js and pnpm
  2. Install Supabase CLI
  3. Run `supabase start` (which applies all migrations automatically)
  4. Install project dependencies (`pnpm install`)
  5. Install Playwright browsers (`npx playwright install --with-deps`)
  6. Run `npx playwright test`
  7. Upload test results as artifacts on failure

#### Scenario: Supabase start timeout
- **WHEN** `supabase start` takes longer than expected in CI
- **THEN** the health check in `global-setup.ts` SHALL retry up to 30 attempts (30 seconds) before failing

### Requirement: CI health check alignment

`global-setup.ts` health check `maxAttempts` SHALL be increased from 10 to 30, matching the existing `seed-e2e-users.ts` retry count.

#### Scenario: Slow CI cold start
- **WHEN** Supabase Docker takes >10 seconds to start in CI
- **THEN** the health check SHALL continue retrying up to 30 seconds before failing
