## Review Summary

**Status**: Ready — proceed to specs/tasks
**Iteration**: 1 of max 2

Five reviewers ran in parallel: architecture-reviewer, security-reviewer, quality-reviewer, testability-reviewer, integration-reviewer. They produced no Critical blockers but a focused set of Important issues, most of which were tightening of contracts in `escapeForOrFilter`, `deriveSearchState`, and the RLS test setup. All Critical and Important items were addressed in a single revision pass.

## Architecture

`architecture-reviewer` (oh-my-claudecode:architect) examined `useUserPosts`, `fetchRecentPostsFromSupabase`, and the proposed component cut. Verdict: fits existing patterns. Two concrete recommendations:

1. **Move `escapeIlikePattern` from `user/api/` to `shared/api/postgrestFilters.ts`** so a future board/draft search can reuse it without an extract-and-move refactor. **Applied** — design D8 now places the helper (renamed `escapeForOrFilter`) in `shared/api/postgrestFilters.ts` next to the existing `formatInFilter`.
2. **Require `searchOwnPosts` to throw on Supabase error** — do not mirror the `fetchUserPostsFromSupabase` swallow-and-return-`[]` pattern at `useUserPosts.ts:65-68`, because that would make the *Error* branch of `deriveSearchState` dead code. **Applied** — added new decision **D3a** stating the function throws (matching `fetchRecentPostsFromSupabase` at `post.ts:109-110`).

URL-state deferral (D5) and component boundaries judged sound. `useDebouncedValue` placement in `shared/hooks/` confirmed correct (no collision; greps clean).

## Security

`security-reviewer` (oh-my-claudecode:security-reviewer) found 0 Critical, 1 Important, 2 Minor. RLS confirmed load-bearing; render-path XSS confirmed safe (DOMPurify in `UserPostItem`).

1. **Important — PostgREST `.or()` filter escape was incomplete.** Original design escaped only `%` `_` `\` `,` `(` `)`. Reviewer flagged that `.` (PostgREST operator separator) and `:` (type-cast hint) were missing, enabling crafted strings like `,author_id.eq.OTHER_UUID` (RLS-bounded, but bad hygiene). **Applied** — D8 now percent-encodes the full set `,` `(` `)` `*` `"` `:` `.` and whitespace/newlines, with explicit unit tests including the injection-attempt fixture.
2. **Minor — raw search query must not be attached as Sentry `extra` context** (PII risk). **Applied** — D3 explicitly says `Sentry.captureException(error)` only, no `extra`. Matches the existing `useUserPosts.ts:34` pattern.
3. **Minor — no server-side rate limit beyond client debounce.** Accepted: at per-user row counts in the low hundreds and RLS-scoped queries, each `ILIKE` is cheap. Documented as a deferred consideration.

## Quality & Performance

`quality-reviewer` (oh-my-claudecode:quality-reviewer) found 2 Critical, 3 Important, 0 Minor. All addressed.

1. **Critical — `escapeIlikePattern` spec was internally contradictory between D1 and D8** (D1 said comma/paren handled via URL-encoding; D8 said "Supabase client handles, but to be safe we also strip"). **Applied** — D1 now defers to D8 as the single source of truth; D8 specifies one unambiguous algorithm. No double-encoding.
2. **Critical — Whitespace-only queries would match every post.** `query.length >= 2` passes for `"  "` and produces `%  %` ILIKE pattern. **Applied** — D3 now states the hook expects an **already-trimmed** value; `UserPostSearchView` `.trim()`s the debounced value before passing.
3. **Important — "2 characters" was ambiguous for Korean.** **Applied** — D3 explicitly says "2 JS `String.length` code units = 2 Hangul syllables or 2 Latin chars." One-syllable matching is intentionally below threshold. Trade-off documented.
4. **Important — `keepPreviousData: true` makes idle-vs-stale subtle.** **Applied** — D7 now codifies the evaluation order as 1) idle gate before everything, 2) error, 3) loading, 4) empty, 5) results. Pure function `deriveSearchState` exported for unit testing. Test cases enforce the order including the keepPreviousData regression.
5. **Important — No input length cap.** **Applied** — D4 adds `maxLength={100}` to the `<input>` and trims before the search fires.

Reviewer also confirmed component count (5 new files) is right-sized, three-layer scoping invariant is well-reasoned, and reuse of `FEED_POST_SELECT` is correct.

## Testability

`testability-reviewer` (oh-my-claudecode:test-engineer) found 2 Critical, 3 Important, 2 Minor. All addressed.

1. **Critical — Layer-4 RLS test must specify the user-auth client, not service-role.** Service-role bypasses RLS entirely, so an accidentally-misconfigured test would silently turn green. **Applied** — Layer 4 section now leads with: "All Layer-4 tests use the user-auth client (signed-in session JWT), not the service-role key."
2. **Critical — `useDebouncedValue` was deferred to integration coverage.** Reviewer pointed out it has a real timing contract testable with `vi.useFakeTimers`. **Applied** — Layer 1 now lists `useDebouncedValue` unit tests with five cases (initial-sync, no-update-before-delay, emits-after-delay, debounce-not-throttle, cleanup-on-unmount).
3. **Important — "5 states = 5 cases" did not cover transitions.** **Applied** — added one transition test in Layer 2 Component↔Hook: start in `'results'`, clear the query, assert idle prompt + previous cards gone. This is the keepPreviousData + idle regression guard.
4. **Important — `deriveSearchState` purity claim needed enforcement.** **Applied** — D7 explicitly says the function is exported as a pure function so it can be unit-tested without rendering.
5. **Important — Integration test data not deterministic (`offset ~1000`).** **Applied** — Layer 2 fixture now specifies: 1500-char body, literal `BODYNEEDLE` at offset **exactly 1000**, 60 posts seeded with `LIMITNEEDLE` in title for the 50-cap test. Deterministic across machines/Supabase resets.
6. **Minor — Mobile keyboard reflow only verbally claimed.** **Applied** — Layer 3 now has an explicit mobile-viewport scenario (iPhone-class UA, 390×844 viewport, virtual keyboard simulation).
7. **Minor — 50-row cap test didn't assert ordering.** **Applied** — Layer 2 fixture asserts `results[0].created_at >= results[49].created_at` and that the 10 oldest seeded posts are absent.

## API & Integration

`integration-reviewer` (oh-my-claudecode:code-reviewer) found 0 Critical, 2 Important, 5 Minor.

1. **Important — Naming collision between new `useUserPostSearch` and existing `useUserSearch`.** **Applied** — new decision **D11** documents the collision and requires a `@see useUserSearch` JSDoc cross-reference at the top of `useUserPostSearch.ts`. Renaming the existing hook is a follow-up if anyone hits the confusion (single consumer in `BlockedUsersPage.tsx`, low risk to keep as-is).
2. **Important — Cache-invalidation gap on post create/edit.** Existing `postCacheUtils` does not touch `['userPostSearch', ...]`. **Applied** — D3 explicitly accepts this for v1 (search-immediately-after-create is uncommon; 30 s `staleTime` bounds the window). Documented as an accepted trade-off with a clear escalation path (prefix-invalidate in `postCacheUtils` if feedback warrants).
3. **Minor — Cross-module import of `FEED_POST_SELECT` and `mapRowToPost` from `post/api/`.** Acknowledged in design. Sibling APIs (`useUserPosts`) do the same.
4. **Minor — Routing unaffected.** Confirmed.
5. **Minor — Korean copy is consistent with the rest of the app (inline string literals; no i18n framework in the codebase).** Confirmed; no action.
6. **Minor — `useDebouncedValue` has no `shared/hooks/` index export.** Matches the rest of the directory (no barrel file). No action.
7. **Minor — Component file naming consistent** (`UserPostSearchView.tsx`, `UserPostSearchInput.tsx`). Confirmed.

## Consolidated Findings

### Critical

| # | Source | Issue | Resolution |
|---|---|---|---|
| C1 | quality | D1 and D8 contradicted each other on escape ownership | D1 defers to D8; D8 is single source of truth |
| C2 | quality | Whitespace-only query would match every post | D3 requires pre-trimmed query into the hook |
| C3 | testability | Layer-4 RLS test could use service-role and falsely pass | Layer 4 section pins user-auth client |
| C4 | testability | `useDebouncedValue` left to integration only | Added Layer-1 unit tests with `vi.useFakeTimers` |

### Important

| # | Source | Issue | Resolution |
|---|---|---|---|
| I1 | architecture | `escapeIlikePattern` should live in `shared/api/` | D8 moved to `shared/api/postgrestFilters.ts` |
| I2 | architecture | `searchOwnPosts` must throw, not return `[]` | New D3a codifies throw-on-error |
| I3 | security | Escape set missed `.` and `:` (PostgREST grammar) | D8 broadened to full reserved set |
| I4 | security | Don't send raw query to Sentry | D3 forbids `extra` payload |
| I5 | quality | "2 characters" ambiguous for Korean | D3 explicit: 2 JS code units |
| I6 | quality | `keepPreviousData` + idle interaction subtle | D7 codifies evaluation order |
| I7 | quality | No input length cap | D4 adds `maxLength={100}` |
| I8 | testability | State-transition test missing | Layer 2 transition test added |
| I9 | testability | Test fixture offsets non-deterministic | Layer 2 fixture specifies exact offsets and sentinels |
| I10 | integration | `useUserPostSearch` / `useUserSearch` naming collision | D11 documents + requires JSDoc cross-ref |
| I11 | integration | Cache-invalidation gap on post create | D3 explicitly accepts for v1 with escalation path |

### Minor

| # | Source | Issue | Resolution |
|---|---|---|---|
| M1 | security | No server-side rate limit | Accepted — per-user RLS-scoped query is cheap |
| M2 | testability | Mobile keyboard reflow only verbally claimed | Layer 3 mobile-viewport scenario added |
| M3 | testability | 50-cap test missed ordering assertion | Layer 2 ordering assertion added |
| M4 | architecture | D10 naming clarification (`PostItem` named export inside `UserPostItem.tsx`) | D10 clarified |
| M5 | quality | Proposal/design mentioned `useDeferredValue` inconsistently | D4 explicitly supersedes proposal's wording |

## Accepted Trade-offs

- **Single-syllable Hangul searches** are below the 2-code-unit threshold. Users can pair with another character. Revisit if data shows real friction.
- **Cache invalidation on post create/edit** is deferred for v1 — within 30 s `staleTime`. Bounded, recoverable, and the use-case is uncommon.
- **Renaming existing `useUserSearch`** is a follow-up, not in this PR. JSDoc cross-reference is the v1 mitigation.
- **No server-side rate limit beyond the 300 ms client debounce and 50-result cap.** Acceptable while per-user counts stay in the low hundreds and queries are RLS-scoped.
- **HTML tags inside `content` cause false positives only when users type HTML-like strings** — vanishingly rare for Korean prose.
- **No deep-link / URL-state for search** in v1. Local component state. Migration path is clean if requested (D5 explicitly low-friction to URL-state later).

## Revision History

- **Round 1 — 2026-05-13**: Five reviewers in parallel returned 4 Critical / 11 Important / 5 Minor findings. All Critical and Important resolved in one revision pass via targeted edits to D1, D3, D3a (new), D4, D7, D8, D10, D11 (new), and the Testability Notes section (Layers 1, 2, 3, 4). Three Minor items accepted with rationale; two resolved.
- **No second round needed**: After revision, no Critical issues remain and all Important findings have explicit resolutions or accepted trade-offs.
