# E2E Test Strategy Redesign

**Date:** 2026-05-16
**Owner:** @BumgeunSong
**Status:** Design — ready to implement

## Goals

Build an E2E suite that gives high confidence on every PR while staying fast and refactor-resistant.

1. **Protection against regressions.** Every critical user path runs on every PR.
2. **Resistance to refactoring.** Tests assert on user-observable behavior, not on DOM structure or copy.
3. **Efficiency.** PR-blocking job stays under 4 minutes.
4. **Up-to-date.** Stale specs (Quill editor, examples) leave the tree.

## Today's state

Current workflow `.github/workflows/run-playwright.yml` runs about 3 minutes — but ~2 minutes go to a cold Supabase Docker pull. Only 5 specs in `tests/data-flows/` run. The other specs in `tests/` (auth, editor-*, OTP signup, image-upload) are not in CI.

Other problems:
- `workers: 1` + `retries: 2` on CI: slow and hides flakes.
- Two `playwright.config.ts` files (root and `apps/web/`) drift over time.
- Comment spec couples to a seeded post (`e2e-post-000`); any mutation of that row breaks unrelated tests.
- Selectors traverse the DOM (`commentInput.locator('..').locator('button')`).
- Korean copy strings live inline in every spec.

## Critical paths (ranked, with tier)

| Rank | Path | Tier | Current state |
|---|---|---|---|
| 1 | Login (email/password) → board home | **PR-blocking** | ❌ not in CI |
| 2 | Non-member blocked from board | **PR-blocking** | ✅ in CI |
| 3 | Write post (TipTap) → appears in list | **PR-blocking** | ✅ in CI |
| 4 | Comment on post → visible | **PR-blocking** | ✅ in CI |
| 5 | Post list infinite scroll | **PR-blocking** | ✅ in CI |
| 6 | **Save/load draft in editor** (across reload) | **PR-blocking** | ❌ not in CI (new) |
| 7 | Image upload in editor | Nightly | ❌ not in CI |
| 8 | Notification on comment/reply/reaction (cross-user) | Nightly | ❌ not in CI |
| 9 | Stats display (streak) | Nightly | ✅ in CI today, demoted |
| 10 | OTP signup → onboarding | Nightly | ❌ not in CI |

## Section 1 — Architecture & CI tiers

Two workflows, not one job with conditions.

- `.github/workflows/e2e-pr.yml` — PR-blocking. Triggers on `pull_request` to `main` and on `merge_group`. Path filter skips docs-only PRs. Budget: ≤4 minutes.
- `.github/workflows/e2e-nightly.yml` — broader sweep. Triggers on `schedule` (03:00 KST), on `workflow_dispatch`, and on PR label `run-nightly-e2e`. Three browsers. Failure opens a tracking issue rather than blocking a PR.

Why two workflows, not jobs: different failure semantics, different timeouts, and easier hotfix bypass.

## Section 2 — `e2e-pr.yml`

```yaml
name: E2E (PR)

on:
  pull_request:
    branches: [main]
    paths-ignore: ['**/*.md', 'openspec/**', 'docs/**', '.github/ISSUE_TEMPLATE/**']
  merge_group:

concurrency:
  group: e2e-pr-${{ github.ref }}
  cancel-in-progress: true

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2]
    steps:
      - uses: actions/checkout@v5

      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium

      - uses: supabase/setup-cli@v1
        with: { version: latest }

      - name: Start Supabase (minimal)
        run: supabase start --exclude studio,imgproxy,edge-runtime,logflare,vector

      - name: Write .env.local
        run: cp tests/fixtures/.env.e2e.ci .env.local

      - name: Run Playwright (shard ${{ matrix.shard }}/2)
        run: pnpm exec playwright test --project=pr-blocking
             --shard=${{ matrix.shard }}/2
        env:
          CI: true
          E2E_PORT: 5173

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-shard-${{ matrix.shard }}
          path: |
            test-results/
            playwright-report/
          retention-days: 7

  merge-reports:
    if: always()
    needs: [e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { path: all-blobs, pattern: blob-report-* }
      - run: npx playwright merge-reports --reporter=html all-blobs
      - uses: actions/upload-artifact@v4
        with: { name: playwright-report-merged, path: playwright-report }
```

Key choices:

| Choice | Why |
|---|---|
| Node 22 | Avoid June 2026 Node 20 deprecation |
| pnpm cache + Playwright browser cache | Saves ~30s per run after first hit |
| `supabase start --exclude` | Drops 5 unused images; keeps Mailpit, Auth, Storage, Postgres, Kong |
| Matrix shard 1/2 | Splits 6 specs across two runners |
| `concurrency: cancel-in-progress` | Force-pushes don't pile up |
| `merge_group` trigger | Catches conflicts in merge queue if enabled |
| `paths-ignore` | Docs-only PRs skip the e2e tax |
| `merge-reports` job | One unified HTML report instead of two disjoint shard reports |

Expected wall time: ~2:00 (cached setup ~1:00 + tests ~25s + post-job ~35s).

## Section 3 — Suite structure & selector contract

File layout:

```
tests/
  e2e/
    pr-blocking/
      login.spec.ts
      non-member.spec.ts
      write-post.spec.ts
      comment.spec.ts
      scroll.spec.ts
      draft-persistence.spec.ts
    nightly/
      image-upload.spec.ts
      notification.spec.ts
      stats.spec.ts
      otp-signup.spec.ts
    _fixtures/
      pages/                 # page-object-lite per route
        BoardPage.ts
        PostEditorPage.ts
        PostDetailPage.ts
      data/                  # Supabase admin factories
        seed-post.ts
        seed-comment.ts
        cleanup.ts
      copy.ts                # single source of truth for Korean copy
```

Selector contract:

| Element type | Selector | Example |
|---|---|---|
| Buttons with visible label | `getByRole` | `page.getByRole('button', { name: COPY.submit })` |
| Form inputs | `getByLabel` | `page.getByLabel(COPY.email)` |
| Editor (TipTap) | `data-testid` | `page.getByTestId('post-editor')` |
| Lists and cards | `data-testid` | `page.getByTestId('post-card')` |
| Post detail content | `getByRole('heading')` + visible text | semantic |
| **Banned** | DOM traversal | ❌ `.locator('..').locator('button')` |
| **Banned** | `networkidle` | ❌ explicit waits on visible UI or API responses |

Copy as named constants in `_fixtures/copy.ts`:

```ts
export const COPY = {
  submit: '글 저장',
  title: '제목을 입력하세요',
  email: '이메일',
  comment: '댓글',
};
```

One file changes when copy changes. Tests do not.

Draft spec contract:

```ts
test('draft is preserved across reload', async ({ page }) => {
  const editor = await PostEditorPage.open(page, BOARD_ID);
  await editor.typeContent('half-written content');
  await editor.waitForAutosave();   // waits on DraftStatusIndicator
  await page.reload();
  await expect(editor.contentLocator()).toContainText('half-written content');
});
```

## Section 4 — Data strategy

Strategy: **fixed actors, fresh objects.**

| Data kind | Lifecycle | Owner |
|---|---|---|
| Users (`e2e@`, `e2e2@`, `admin@`) | Global seed, never mutated | global-setup |
| Board (`e2e-test-board`) | Global seed, never mutated | global-setup |
| Membership rows | Global seed | global-setup |
| Posts | Per-test factory `seedPost({ ownerUid, boardId, testId })` | per-test |
| Comments | Per-test factory `seedComment({ postId, body })` | per-test |
| Drafts | Per-test; deleted after | per-test |

Cleanup uses Playwright's `testInfo.testId`. Each row gets `title = "[${testId}] ${title}"`. Global teardown deletes rows where title matches `[%]`. Tests own their data.

Workers: `workers: 2` on CI (was 1). Per-test namespacing makes this safe.

Migration: keep `seed-e2e-users.ts` for users/board/memberships. Delete the 25-post seed; the scroll spec seeds its own batch.

Rewritten comment spec:

```ts
test('comment appears on post', async ({ page }, testInfo) => {
  const post = await seedPost({ ownerUid: USER.member, boardId: BOARD, testId: testInfo.testId });
  await new PostDetailPage(page).goto(post).comment(COPY_BODY);
  await expect(page.getByTestId('comment-list')).toContainText(COPY_BODY);
});
```

No shared `e2e-post-000`. No bespoke cleanup helpers.

## Section 5 — Flake policy & failure feedback

| Setting | New value | Rationale |
|---|---|---|
| `retries` | `1` on CI (was 2) | Absorbs container blips; bug-grade flakes still surface |
| `trace` | `retain-on-failure` (was `on-first-retry`) | Trace on every failure |
| `screenshot` | `only-on-failure` | Keep |
| `video` | `retain-on-failure` | Keep |
| Test timeout | `45_000` on CI (was 60_000) | Forces fast tests |
| `expect.timeout` | `15_000` on CI (was 20_000) | Same |
| `reporter` | `['html', 'github', ['blob']]` | `github` annotates PR diff at failure line; `blob` enables shard merge |

Flaky-test detection: a small post-step parses the JSON report. A test that passes only after retry does not fail the PR. It opens a tracking issue labeled `flaky-test`. After three flags in a week, it leaves the PR-blocking tier.

On-PR feedback:
- Pass: silent.
- Fail: GitHub Checks annotation on the failing line + HTML report link in the check summary.
- Flaky: no PR action; issue opened for triage.

## Section 6 — Migration plan

Audit:

| File | Action |
|---|---|
| `tests/example.spec.ts`, `tests/example-auth.spec.ts` | Delete — placeholders |
| `tests/editor-*.spec.ts` (6 files) | Delete — Quill is gone (`22384d73`) |
| `tests/auth-flow.logged-out.spec.ts` | Fold into new `login.spec.ts` |
| `tests/image-upload.spec.ts`, `tests/editor-image-upload-mock.spec.ts` | Consolidate into `nightly/image-upload.spec.ts` |
| `tests/image-perf.spec.ts` | Move out of suite; nightly + label-gated |
| `tests/data-flows/*.spec.ts` | Migrate to `e2e/pr-blocking/` (4) and `e2e/nightly/` (1: stats) |
| `tests/e2e/otp-signup-happy-path.spec.ts` | Move to `e2e/nightly/otp-signup.spec.ts` |
| `apps/web/playwright.config.ts` | Delete — duplicate of root |
| `playwright.config.prod.ts` | Keep — production smoke is separate |

Source-code edits: add five `data-testid` attributes.

| Component | Testid |
|---|---|
| `PostEditor` (TipTap wrapper) | `post-editor` |
| `PostCard` | `post-card` |
| Comment list container | `comment-list` |
| `DraftStatusIndicator` | `draft-status` |
| Post list scroll container | `post-list` |

Phased rollout (one PR each):

| Phase | Scope | Net effect |
|---|---|---|
| 0 | New `e2e-pr.yml` with caching and `--exclude` Supabase services; specs untouched | CI: 3:00 → ~1:30 |
| 1 | Add `_fixtures/`; migrate `non-member` + `scroll` (read-only) to new layout | No coverage change |
| 2 | Rewrite `write-post` + `comment` against factories; add five `data-testid`s | Removes DOM traversal; removes `e2e-post-000` dependency |
| 3 | Add `login.spec.ts` and `draft-persistence.spec.ts` | Coverage: +2 critical paths |
| 4 | Add `e2e-nightly.yml` cron + `notification.spec.ts` | Nightly safety net live |
| 5 | Delete `tests/example*`, `tests/editor-*`, duplicate config, `_legacy/` | Dead code gone |

Risks and mitigations:

| Risk | Mitigation |
|---|---|
| Phase 2 breaks behavior I don't see | Run new and old specs side by side for one PR, then delete old |
| `data-testid` adds source noise | Only five, all in container components |
| Nightly cron eats free Actions minutes | Mobile Chrome only on cron, not on label-trigger; gate on repo owner |
| Cross-user notification spec flakes | Build last (Phase 4); if flaky, demote to label-gated |

Estimate: Phases 0-3 are about one to two days of work. Phases 4-5 are about another day.

## Open questions for later

- Should production smoke (`playwright.config.prod.ts`) run on a separate cron, daily?
- Should we add a Lighthouse perf gate to the same workflow, or keep performance in `image-perf` only?
- For draft persistence: where is the draft stored — Supabase row, localStorage, or IndexedDB? The spec design assumes the existing `DraftStatusIndicator` is the source of truth for "saved" state regardless of backing store.
