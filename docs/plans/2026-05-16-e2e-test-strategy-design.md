# E2E Test Strategy Redesign

**Date:** 2026-05-16
**Owner:** @BumgeunSong
**Status:** Phase 0 implemented in PR #610 (v2.2). Phases 1–5 are scheduled as follow-up PRs. Design history (v1 → v2 → v2.1 → v2.2) is captured in Section 7.

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

- `.github/workflows/run-playwright.yml` — PR-blocking. Triggers on `pull_request` to `main`. Path filter skips docs-only PRs. Budget: ≤4 minutes. (Add `merge_group` trigger only after merge queue is enabled in branch protection — left out for now to avoid dead config. File rename to `e2e-pr.yml` is deferred to Phase 4 when the nightly workflow lands and the distinction matters; keeping the existing filename now preserves any branch-protection rule referencing the workflow name.)
- `.github/workflows/e2e-nightly.yml` — broader sweep. Triggers on `schedule` (03:00 KST), on `workflow_dispatch`, and on PR label `run-nightly-e2e`. Three browsers. Failure opens a tracking issue rather than blocking a PR.

Why two workflows, not jobs: different failure semantics, different timeouts, and easier hotfix bypass.

## Section 2 — `run-playwright.yml` (PR-blocking workflow)

Revised after review: single runner, no sharding, no merge-reports job. Sharding costs 33% more runner-minutes for a marginal wall-clock gain at 6 specs; add it when spec count exceeds ~12 or test time exceeds setup time. Reuse existing project names so Phase 0 ships independently of the suite-restructure work.

**Phase 0 status:** the workflow content below is what's actually committed in this PR. The file keeps the existing name `run-playwright.yml` so any branch-protection rule continues to match; rename to `e2e-pr.yml` lands with Phase 4.

```yaml
name: Playwright E2E Tests

on:
  pull_request:
    branches: [main]
    paths-ignore: ['**/*.md', 'openspec/**', 'docs/**', '.github/ISSUE_TEMPLATE/**']

concurrency:
  group: e2e-pr-${{ github.ref }}
  cancel-in-progress: true

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with: { version: 9.15.4 }

      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}

      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium

      - uses: supabase/setup-cli@v1
        with: { version: latest }   # See note below — pin only when image cache lands

      - name: Start Supabase (minimal)
        run: supabase start --exclude studio,imgproxy,edge-runtime,logflare,vector,realtime

      - name: Write .env.local
        run: |
          cat > .env.local << 'EOF'
          VITE_SUPABASE_URL=http://127.0.0.1:54321
          VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
          VITE_FIREBASE_API_KEY=fake-api-key-for-e2e
          VITE_FIREBASE_AUTH_DOMAIN=localhost
          VITE_FIREBASE_PROJECT_ID=e2e-test-project
          VITE_FIREBASE_STORAGE_BUCKET=e2e-test.appspot.com
          VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
          VITE_FIREBASE_APP_ID=1:000000000000:web:0000000000000000
          EOF
          sed -i 's/^          //' .env.local

      - name: Run Playwright
        run: pnpm exec playwright test --project=chromium-data-flows --project=chromium-non-member
        env:
          CI: true
          E2E_PORT: 5173

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: |
            test-results/
            playwright-report/
          retention-days: 7
```

Phase 0 uses the **existing project names** (`chromium-data-flows`, `chromium-non-member`). The `pr-blocking` project name proposed earlier requires a config change and belongs to Phase 1–2, when specs actually move into `tests/e2e/pr-blocking/`.

Key choices:

| Choice | Why |
|---|---|
| Node 20 (matches repo standard) | Other workflows (`run-vitest.yml`, `firebase-hosting-merge.yml`, etc.) also use Node 20. The Node 20 deprecation (Sept 2026 forced removal) is real but should be addressed in a single cross-workflow PR, not here |
| pnpm pinned to `9.15.4` | Matches `run-vitest.yml`, `firebase-hosting-merge.yml`, `sentry-bug-fix.yml`. Floating major (`version: 9`) would drift |
| pnpm cache + Playwright browser cache | Saves ~30s per run after first hit |
| Supabase CLI `latest` (was: pinned `1.220.4`) | The pin was tied to a future Docker-image cache that does not yet exist; pinning now blocked CI because `1.220.4` cannot read this repo's `supabase/config.toml` (uses Postgres 17 + recent auth/storage fields). Re-introduce the pin only when we add the image cache, and choose a version known to parse our config |
| `supabase start --exclude` (incl. `realtime`) | Drops 6 unused images; codebase has zero Realtime channel usage (grep-verified) |
| **Single runner, no sharding** | At 6 specs, sharding burns ~33% extra runner-minutes for marginal wall-clock gain. Revisit when spec count ≥ 12 |
| `workers: 2` in `playwright.config.ts` | Parallelism inside a single runner is cheaper than across runners |
| `concurrency: cancel-in-progress` | Force-pushes don't pile up |
| `paths-ignore` | Docs-only PRs skip the e2e tax |
| **No `merge_group` trigger yet** | Repo has no merge queue configured; add when enabled |

Expected wall time:
- Cold cache (first run after dependency change): **~3:00–3:30**
- Warm cache (typical PR): **~2:00–2:30**

Both stay inside the 4-minute budget.

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
| **Banned: DOM traversal** | — | ❌ `.locator('..').locator('button')`; replace with a `data-testid` on the target element |
| **Banned: `networkidle`** | — | ❌ `page.waitForLoadState('networkidle')`; replace with an explicit wait on visible UI (`expect(locator).toBeVisible()`) or a specific API response (`page.waitForResponse(...)`) |

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
  await editor.waitForAutosave();   // waits on data-testid="draft-status-saved"
  await page.reload();
  await expect(editor.contentLocator()).toContainText('half-written content');
});
```

The `waitForAutosave` helper waits on `data-testid="draft-status-saved"`, which the `DraftStatusIndicator` component renders only when `!isSaving && lastSavedAt !== null && !savingError`. Waiting on the indicator's text would be unreliable — it shows a relative-time string ("마지막 저장: N초 전") that changes every render and depends on the system clock.

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
| `reporter` | `['html', 'github', ['json', { outputFile: 'playwright-report.json' }]]` | `github` annotates PR diff at failure line; `json` provides a machine-readable artifact for the flake detector |

Flaky-test detection: a small post-step parses `playwright-report.json` (produced by the `json` reporter above). A test that passes only after retry does not fail the PR. It opens a tracking issue labeled `flaky-test` — **only if the same test has retry-passed in at least two separate runs within a 7-day window**. A single retry-pass on infra blip (DNS, container startup) does not generate noise. After three flags in a week, the test is marked `test.skip` (not deleted) with a comment linking the tracking issue; the body and failure evidence stay in the tree.

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

Source-code edits: add **seven** `data-testid` attributes (revised up from five after review).

| Component | Testid | Notes |
|---|---|---|
| `PostEditor` (TipTap wrapper) | `post-editor` | replaces `.ProseMirror` raw class |
| `PostCard` | `post-card` | replaces `[role="button"][aria-label="게시글 상세로 이동"]` chain |
| Comment list container | `comment-list` | assertion target |
| Comment submit button | `comment-submit` (or `aria-label="댓글 제출"`) | **new** — fixes the banned `.locator('..').locator('button')` traversal in `comment.spec.ts` |
| `DraftStatusIndicator` (container) | `draft-status` | structural anchor |
| `DraftStatusIndicator` ("saved" state) | `draft-status-saved` | **new** — appears only when `!isSaving && lastSavedAt !== null && !savingError`. The draft spec waits on this; without it the spec races on text content |
| Post list scroll container | `post-list` | structural anchor |

Phased rollout (one PR each):

| Phase | Scope | Net effect |
|---|---|---|
| **0 ✅ this PR** | Modified `run-playwright.yml` (kept filename) — caching, `--exclude` (incl. `realtime`), pinned versions (`pnpm 9.15.4`, `supabase-cli 1.220.4`), single runner. Modified `playwright.config.ts` — `workers: 2`, `retries: 1`, `trace: retain-on-failure`, `timeout: 45s` test / `15s` expect, added `json` reporter. Verified: YAML parses, `playwright test --list` returns 9 tests cleanly | CI: 3:00 → ~2:00 (warm) |
| 1 | Add `_fixtures/`; introduce `tests/e2e/pr-blocking/` project in `playwright.config.ts`; migrate `non-member` + simplified `scroll` (initial-load assertion only) to new layout | No coverage change; detailed pagination test moves to nightly |
| 2 | Add six `data-testid`s to source (`post-editor`, `post-card`, `comment-list`, `comment-submit`, `draft-status`, `post-list`); rewrite `write-post` + `comment` against factories | Removes DOM traversal; removes `e2e-post-000` dependency |
| 3 | Add `draft-status-saved` testid to source; add `login.spec.ts` and `draft-persistence.spec.ts` | Coverage: +2 critical paths |
| 4 | Add `e2e-nightly.yml` cron + `notification.spec.ts`; move detailed scroll test, stats, OTP signup, image upload to nightly | Nightly safety net live |
| 5 | Delete `tests/example*`, `tests/editor-*` (Quill removed in `22384d73`), `apps/web/playwright.config.ts` (no scripts reference it), `_legacy/` | Dead code gone |

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

## Section 7 — Review feedback applied

This section documents the changes between v1 and v2 of the design. Three reviewers in parallel — a hostile critic, a test-engineering specialist, and a CI-architecture specialist — examined v1. The findings flagged by multiple reviewers became the v2 changes below.

| Reviewer finding | v1 claim | v2 revision | Severity |
|---|---|---|---|
| Phase 0 is not independently shippable — workflow used `--project=pr-blocking` which doesn't exist in `playwright.config.ts` | Phase 0 ships caching only | Phase 0 reuses existing project names; the `pr-blocking` project name moves to Phase 1 | Blocker |
| `merge-reports` job referenced `blob-report-*` artifacts but the reporter wasn't configured to emit them | `merge-reports` job included | Job removed; single runner; revisit when sharding becomes worthwhile | Blocker |
| `DraftStatusIndicator` has no deterministic "saved" state to wait on (text shows relative time that changes every render) | `waitForAutosave` waits on the indicator | New `data-testid="draft-status-saved"` flips only when `!isSaving && lastSavedAt !== null && !savingError`; spec waits on the testid, not text | Would flake |
| Comment submit button still uses banned DOM traversal (`.locator('..').locator('button')`) | Selector contract banned DOM traversal but didn't add a source-side testid | New testid `comment-submit` (or `aria-label="댓글 제출"`) added; testid count 5 → 7 | Contract violation |
| Sharding burns 33% extra runner-minutes for marginal wall-clock gain at 6 specs | Matrix shard 1/2 | Dropped; revisit at ~12+ specs | Waste |
| `merge_group` trigger is dead — repo has no merge queue configured | Trigger included | Removed; add when merge queue is enabled in branch protection | Dead config |
| Wall-time estimate `~2:00` ignored 2× Supabase Docker boot from sharding | `~2:00` flat | `~2:00–2:30` warm, `~3:00–3:30` cold; both inside budget | Optimistic |
| Scroll spec is the weakest on Khorikov criteria — couples to Supabase REST URL + `waitForTimeout` | All current data-flows in PR-blocking | Phase 1 keeps "initial page load shows posts" in PR-blocking; detailed pagination moves to nightly | Refactor-fragile |
| `realtime` should be excluded — codebase has zero Realtime channel usage (grep-verified) | Realtime kept in Supabase boot | Added to `--exclude` list; one less container | Small win |
| Flake auto-issue created on a single retry-pass produces noise from infra blips | Open issue on any retry-pass | Require 2 retry-passes within 7 days before issue; auto-`test.skip` (not delete) at 3 flags | Noise control |
| Pinned Supabase CLI version makes future image cache key stable | `version: latest` | `version: 1.220.4` pinned | Cache hygiene |

**Findings noted but not applied** (deferred to Phase 1+):

- Cross-user privacy assertion in draft spec ("user B does not see user A's draft") — adds value, but the basic save/load is the PR-blocking smoke. Add as a follow-up test in Phase 3.
- Auto-`test.skip` mechanism for repeatedly-flaky specs — design is sound but tooling work; tracked separately.
- Icon-only TipTap toolbar buttons need `aria-label` for the nightly image-upload spec to follow the contract. Not in PR-blocking critical path; address in Phase 4 alongside the image-upload spec move.

**Findings rejected:**

None — every flagged issue had clear merit. Where a reviewer suggested a tradeoff (e.g. "drop sharding entirely now"), this design accepts the suggestion rather than carrying the v1 complexity.

### v2.1 — Copilot reviewer findings (PR #610)

| Finding | v2 claim | v2.1 revision |
|---|---|---|
| `actions/checkout@v5` diverges from repo standard `@v4` | `@v5` used | `@v4` — matches `run-playwright.yml`, `run-vitest.yml`, all other workflows |
| `pnpm version: 9` (floating major) diverges from repo's pinned `9.15.4` | Floating major | Pinned `9.15.4` — matches `run-vitest.yml`, `firebase-hosting-merge.yml`, `sentry-bug-fix.yml` |
| Node 22 diverges from repo's Node 20 | Node 22 chosen for deprecation forward-compat | Reverted to Node 20. The deprecation is real but should be addressed across all workflows in one PR, not just here |
| `cp tests/fixtures/.env.e2e.ci .env.local` references file that doesn't exist | Fictional fixture path | Replaced with inline heredoc (same approach as current `run-playwright.yml`); no new file required for Phase 0 |
| Flake detector "parses JSON report" but reporter list has no JSON output | `['html', 'github', ['blob']]` | Reporter list now `['html', 'github', ['json', { outputFile: 'playwright-report.json' }]]`; flake detector input is explicit |
| Selector contract "Banned: networkidle" row was confusingly worded — read like it banned the alternative | Ambiguous example column | Reworded both banned rows so the ❌ marks the banned pattern and the row text states the replacement |

All six Copilot findings were valid — each one was a consistency or spec-completeness gap. None were rejected.

### v2.2 — Scope change: design-doc PR became Phase 0 implementation PR

PR #610 was originally a doc-only change. User decision: ship Phase 0 in the same PR so the design lands together with the first concrete CI win. This commit:

- Modifies `.github/workflows/run-playwright.yml` (kept name) per the v2.1 design
- Modifies `playwright.config.ts` with the Section 5 flake-policy values
- Verified locally before push: `python3 -c "import yaml; yaml.safe_load(...)"` and `SKIP_SEED=1 CI=true pnpm exec playwright test --list --project=chromium-data-flows` both succeed (9 tests listed, no parse errors)

The actual CI behavior change is verified by the workflow running on this PR — see the GitHub Actions check on this PR after push.
