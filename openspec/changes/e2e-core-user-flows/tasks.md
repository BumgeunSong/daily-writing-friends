## 1. Seed Infrastructure

- [x] 1.1 Create `scripts/seed-e2e-domain.ts`: read `e2e-users.json`, validate IDs, upsert board + memberships + posts + comments via service_role REST API. Compute dates relative to `new Date()`. Add localhost runtime guard. Output to `tests/fixtures/e2e-domain.json`.
- [x] 1.2 Update `tests/global-setup.ts`: call `seedDomain()` after `seedUsers()`. Treat domain seed failure as fatal. Increase health check `maxAttempts` from 10 to 30.
- [x] 1.3 Create `tests/helpers/seed-cleanup.ts`: shared utility for beforeEach/afterEach cleanup of `e2e-write-` prefixed data via service_role API.

## 2. Auth & Playwright Config

- [x] 2.1 Extend `tests/auth.setup.ts`: authenticate `e2e2@example.com` → save to `storageState.non-member.json`.
- [x] 2.2 Update `playwright.config.ts`: add `chromium-non-member` project (`testMatch: /.*\.non-member\.spec\.ts/`, uses `storageState.non-member.json`, depends on `setup`). Add `chromium-data-flows` project for data-flow specs (chromium only, `testDir: tests/data-flows/`). Exclude `tests/data-flows/` from multi-browser projects.

## 3. E2E Spec Files

- [x] 3.1 Create `tests/data-flows/post-write-flow.spec.ts`: navigate to editor → write post with `e2e-write-` prefix → submit → verify post appears in board list. Use `beforeEach`/`afterEach` cleanup from seed-cleanup helper.
- [x] 3.2 Create `tests/data-flows/post-list-scroll.spec.ts`: navigate to board → verify initial posts loaded → `scrollIntoViewIfNeeded()` on last item → `waitForResponse` with URL pattern → verify additional posts appear.
- [x] 3.3 Create `tests/data-flows/comment-flow.spec.ts`: navigate to seeded post detail → write comment with `e2e-write-` prefix → verify comment appears in comment section. Use `beforeEach`/`afterEach` cleanup.
- [x] 3.4 Create `tests/data-flows/stats-display.spec.ts`: navigate to stats page → verify contribution grid renders → verify streak indicator is visible.
- [x] 3.5 Create `tests/data-flows/board-access.non-member.spec.ts`: navigate to board URL as non-member → verify error page is displayed (not board content).

## 4. CI Workflows

- [x] 4.1 Create `.github/workflows/run-playwright.yml`: install Node/pnpm → install Supabase CLI → `supabase start` → `pnpm install` → `npx playwright install --with-deps` → `npx playwright test`. Upload test artifacts on failure. Trigger on PR open/update.
- [x] 4.2 Create `.github/workflows/test-gate.yml`: on PR, check if `src/` files changed. If yes and no `.test.`/`.spec.` files in changeset, add `missing-tests` label. If test files exist, remove label. Skip if no `src/` changes.

## Tests

### E2E (Playwright — agent-browser / Supabase local)

- [x] T.1 Verify `post-write-flow.spec.ts` passes: post created → visible in list → cleaned up after test
- [x] T.2 Verify `post-list-scroll.spec.ts` passes: initial page loads → scroll triggers additional load → all seeded posts visible
- [x] T.3 Verify `comment-flow.spec.ts` passes: comment created → visible in post detail → cleaned up after test
- [x] T.4 Verify `stats-display.spec.ts` passes: stats page renders → contribution grid visible → streak indicator visible
- [x] T.5 Verify `board-access.non-member.spec.ts` passes: non-member user sees error page when accessing board
- [x] T.6 Verify seed idempotency: run `global-setup` twice → no errors, same DB state
- [ ] T.7 Verify all specs pass in CI (requires PR push to trigger workflow) (`run-playwright.yml`): full pipeline with Supabase Docker in GitHub Actions
