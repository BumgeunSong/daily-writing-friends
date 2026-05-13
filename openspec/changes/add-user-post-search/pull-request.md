# Pull Request — add-user-post-search

## PR Details

- **URL**: https://github.com/BumgeunSong/daily-writing-friends/pull/579
- **Branch**: `user-post-search`
- **Base**: `main`
- **Status**: Open (CI green, awaiting review)
- **Opened**: 2026-05-13

## CI Checks

All non-skipping checks green on the first run; no fix-and-push cycle needed.

| Check | Status | Workflow |
|-------|--------|----------|
| CodeQL | pass | CodeQL |
| Analyze (actions) | pass | CodeQL |
| Analyze (javascript-typescript) | pass | CodeQL |
| check-tests | pass | Test Gate |
| test (20.x) | pass | Run Vitest |
| e2e | pass | Playwright E2E Tests |
| Vercel Preview Comments | pass | (Vercel) |
| Vercel – daily-writing-friends-admin | pass | (Vercel) |
| Vercel – daily-writing-friends-mcp | pass | (Vercel) |
| GitGuardian Security Checks | skipping | (no scan needed) |

## Review Iterations

### Round 1 — 2026-05-13 (agent-driven self-review)

Six specialized reviewers ran in parallel against `4c747bbc..708f5bb2`: pr-review-toolkit `code-reviewer`, `pr-test-analyzer`, `silent-failure-hunter`, `type-design-analyzer`, `comment-analyzer`, and oh-my-claudecode `security-reviewer`. 27 findings total. Triage:

**Must-fix (applied in commit `8721b9dd`):**

- **Cap-banner off-by-one** (code-reviewer C1, confidence 92). `.limit(50)` returns exactly 50 whether the underlying set is exactly 50 or larger; the view's `>= 50` check then triggers the "narrow your query" notice for users whose total matches happen to equal 50. Fix: query `limit + 1` to probe overflow, slice display to `RESULTS_CAP`, show the notice only when `data.length > RESULTS_CAP`. Re-ran T.5 (60 LIMITNEEDLE seed) → `{cardCount: 50, capNoticeVisible: true}` unchanged; T.3 ("오늘", 1 result) → `{cardCount: 1, capNoticeVisible: false}` ✓.
- **`console.error` PII via `PostgrestError.details`** (security-reviewer Medium #1 + silent-failure-hunter M2). The full Supabase error object — whose `details` field can echo back the filter string containing the user's raw query — was being logged via `console.error`, undoing the deliberate "no PII to Sentry" design decision whenever a console-scraping log collector (Datadog RUM, LogRocket, FullStory) is in the path. Fix: drop the `console.error` line; let the (no-`extra`) `Sentry.captureException` in the hook be the sole telemetry path. Added a `feature: 'user-post-search'` tag so the report doesn't get lost among generic Supabase errors. Divergence from peer pattern in `useUserPosts.ts:65-67` is justified because peers filter by `boardId`, not by user-typed strings.

**Suggestions (filed as follow-up — not blocking this PR):**

- **SF-1: Hoist duplicated constants** `MIN_QUERY_LENGTH = 2` (hook + view) and `RESULTS_CAP/DEFAULT_LIMIT = 50` (api + view) to a shared constants file. Both code-reviewer (I3/I4) and type-design (P0) flagged this — drift risk between the hook's `enabled` and the view's `idle` gate.
- **SF-2: Tighten T.11 RLS evidence** with a service-role control call so the test cannot false-pass on a seed coincidence (pr-test-analyzer C1).
- **SF-3: Three additional `escapeForOrFilter` tests** — `!` prefix, `not.ilike` reconstitution, `and(...)` nested-group injection — to lock the safety invariant against future encoding-set narrowing (pr-test-analyzer C2/C3).
- **SF-4: "다시 시도" button** in the error state, calling `result.refetch()`. The current copy promises retry but offers no affordance; same-key cache makes refetch impossible without it (silent-failure I1).
- **SF-5: Comment polish** — drop `(design D7)` token (rot vector after archive), correct "whitespace" wording in `escapeForOrFilter` JSDoc, drop `useDebouncedValue` JSDoc that restates the implementation (comment-analyzer #1/#4/#7).

**Nice-to-have (deferred without ticket):**

Discriminated-union `SearchState` (type-design P2), single-gate `UserPageHeader`/`UserPostSearchView` (type-design P1), Sentry tags expansion, network-count debounce assertion, `data === undefined`+long-query test, `maxLength=100` DOM assertion. None are correctness issues — they are tidiness wins for a follow-up sweep.

**Questions:** None.

### Round 2

_Pending — awaiting human reviewer feedback. CI is green on the fix commit (`8721b9dd`); 9 checks pass._

## Final Status

- [x] All CI checks pass (post-fix)
- [x] All review comments addressed _(agent review Round 1; human review still pending)_
- [x] No unresolved conversations
- [x] Spec alignment valid after review fixes _(the cap-fix slice happens in the view; spec wording in "50-result cap notice" still holds — the notice appears only when the cap is **hit**, which is now genuinely true)_

When a human reviewer posts inline comments, add Round 2 above with the same triage format.
