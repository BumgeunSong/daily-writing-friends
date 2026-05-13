# Spec Alignment Report — add-user-post-search

Generated: 2026-05-13. Source: `specs/user-post-search/spec.md`.

Every requirement was traced against `apps/web/src/...` code, the Layer 1 Vitest suite, and the Layer 4 evidence in `verify_report.md`.

## Alignment Summary

| Spec File | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| spec.md | Search Affordance on Own User Page | Aligned | `UserPageHeader.tsx` renders the icon when `isMyPage && !isSearchMode`; returns `null` otherwise. T.10 verified the not-own-page case. |
| spec.md | Entering and Exiting Search Mode | Aligned (architectural divergence noted) | All user-visible scenarios pass. The implementation replaces `UserPageHeader` with `UserPostSearchView`'s own sticky chrome in search mode rather than mutating the existing header's children; the spec wording "the header content transforms in place" is satisfied at the UX level. T.3 / T.9 / T.10 confirm. |
| spec.md | Search Input Behavior | Aligned | `UserPostSearchInput.tsx` owns local state, `useDebouncedValue` at 300 ms, `maxLength={100}`. View `.trim()`s before passing to the hook; hook gates on `query.length >= 2`. T.3 exercised the 300 ms debounce + Korean 2-char gate. |
| spec.md | Search Result States | Aligned | Five-state machine in `deriveSearchState.ts` (Layer 1 test exercises all five + the order). `UserPostSearchView.tsx` renders the exact Korean copy. T.4/T.5/T.6/T.8 saw four states in production; idle + error covered by Layer 1. |
| spec.md | Search Query Semantics | Aligned | `searchOwnPosts.ts` uses `title.ilike,content.ilike` against the full `content` column, `.order('created_at', { ascending: false }).limit(50)`. T.3 (title), T.4 (content past 500), T.5 (cap + ordering) verified. |
| spec.md | Search Scope Is Always the Profile Owner's Own Posts | Aligned | Three-layer invariant intact — UI gate (`isMyPage`), API filter (`.eq('author_id', userId)`), RLS. T.6 + T.10 + T.11 all green; T.11 specifically confirmed the RLS layer blocks user B's private post. |
| spec.md | Input Value Is Escaped Before Reaching PostgREST | Aligned | `escapeForOrFilter` covers ILIKE wildcards (`\` `%` `_`) and PostgREST-reserved chars (`,()*":.\s`). 19 Vitest cases including the injection-attempt fixture. |
| spec.md | Performance and Caching | Aligned | `useUserPostSearch` configures `staleTime: 30_000`, `cacheTime: 5 * 60_000`, `keepPreviousData: true`; `deriveSearchState` honours the keep-previous-data semantics (Layer 1 test). No "load more" affordance is rendered (no `useInfiniteQuery`, hard cap at 50, cap notice instead). |
| spec.md | Accessibility | Aligned | All four ARIA labels present (`내 글 검색`, `내 글 검색어`, `검색 닫기`, `aria-pressed`); `inputMode="search"`, `enterKeyHint="search"` on the input; focus return verified by T.9. T.7 (mobile-virtual-keyboard) deferred but does not contradict the spec wiring. |

## Drifted Requirements

### Entering and Exiting Search Mode — architectural divergence (user-visible behavior unchanged)

- **Spec says:** "the header content transforms in place to show a back/close button … and a text input … the header element acquires sticky positioning (`sticky top-0 z-10`)."
- **Implementation does:** `UserPageHeader` returns `null` when `isSearchMode` is true, and `UserPage.tsx` renders `UserPostSearchView` instead of the (header + profile + list) tree. `UserPostSearchView.tsx` owns its own sticky chrome (`<header className="sticky top-0 z-10 bg-background py-3">`) containing the close button + `UserPostSearchInput`.
- **Why it drifted:** Following design D4 ("input keeps a local value … reports a debounced value upward"), if the input lives inside `UserPageHeader`, then either (a) state must be lifted to `UserPage` so the header and the body both see it, or (b) a portal must move the input element across the tree. Both fight the "View owns the trimmed query" requirement in task 4.3. Owning the entire sticky chrome inside `UserPostSearchView` keeps state ownership in one component and avoids prop-drilling the immediate input value through three components.
- **Resolution:** No spec change required. Every observable scenario assertion still holds: the user sees a sticky region with a close button + input where the header used to be; the title + settings are hidden; focus lands on the input; `UserProfile` + `UserPostsList` are unmounted. The implementation note is captured in `tasks.md` 5.3 with a parenthetical.

## Missing Requirements

None. Every spec requirement maps to implementation code and at least one passing layer of verification.

## Removed Requirements

None.

## Spec Updates Made

None. The single divergence is a *how* choice that does not contradict any *what* in the scenarios. Specs remain accurate for PR reviewers.

## Coverage Caveats (carry-forward from verify_report.md)

These are *not* drifts — they are spec requirements whose evidence is partial (one layer instead of two). Flag them for reviewer judgment, but they do not block the alignment status:

| Requirement | Caveat |
|---|---|
| Search Input Behavior — `maxLength=100` | Attribute is wired in source; no dedicated Layer-4 path asserts the 101st keystroke is rejected. |
| Accessibility — mobile keyboard hints (T.7) | Deferred to a follow-up run with `agent-browser -p ios`. |
| Search Result States — `idle` and `error` | Covered exhaustively by Layer 1 `deriveSearchState`; no Layer-4 path forces a Supabase error (would require disconnecting the DB). |
| Performance and Caching — live cache hit | Layer 1 verified the state-machine; no Layer-4 path observed a same-key second invocation skipping the network call. |
