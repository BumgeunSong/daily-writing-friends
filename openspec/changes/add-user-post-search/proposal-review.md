## Review Summary

**Status**: Ready — proceed to design
**Iteration**: 1 of max 2

Three reviewers ran in parallel (objectives-challenger, alternatives-explorer, user-advocate). All Critical and most Important findings were addressed in a single revision pass; no second round was needed.

## Findings

### Critical

1. **Search target was `content_preview` only — silently misses matches past ~500 chars of HTML.**
   *Source*: objectives-challenger.
   `content_preview` is `LEFT(content, 500)` where `content` is HTML. After tags, effective searchable prose is ~300–350 chars. For a daily-writing app where posts are routinely 1–3 KB, users searching for a phrase from the middle of a post would get zero results and conclude search is broken.
   **Resolved**: Match in the `WHERE` against the full `content` column; keep `SELECT` on `content_preview` so payload stays small. (Reviewer's option (b).)

2. **`pg_trgm` GIN index is over-engineered at per-user scale.**
   *Source*: alternatives-explorer.
   The existing `idx_posts_author_created` composite already narrows the scan to a single user's posts (low hundreds). Adding two GIN trigram indexes + a new extension is migration risk and write-amplification for zero perceptible latency improvement at this scale. Trigram indexes matter for cross-user search, which is a non-goal.
   **Resolved**: Removed the migration from v1. Documented `pg_trgm` as a future option if per-user row counts grow or scope broadens.

3. **What does a visitor see on someone else's user page?**
   *Source*: user-advocate.
   The proposal scoped search to "profile owner's posts only" but never said whether the search icon is hidden, visible-but-disabled, or visible and searches that user's public posts. Three different features.
   **Resolved**: Explicitly hidden on other users' pages (`isMyPage` guard in the header). The API layer also always sets `eq('author_id', userId)` and RLS enforces the same invariant — defense in depth. Spec must encode this.

4. **Mobile keyboard / focus / Escape handling were missing.**
   *Source*: user-advocate.
   Header is `position: static`; on iOS the keyboard can occlude or shift the input. No spec for auto-focus on toggle, Escape to exit, or where focus returns on exit.
   **Resolved**: In search mode the header becomes `sticky top-0 z-10`; input is auto-focused; Escape exits search mode and returns focus to the search icon button; input uses `inputMode="search"` and `enterKeyHint="search"`.

5. **Empty-input state vs. empty-results state were conflated.**
   *Source*: user-advocate.
   "Show empty state when no results" doesn't distinguish "you haven't typed yet" from "your query matched nothing."
   **Resolved**: Five distinct states defined (idle / loading / results / empty / error) with specific Korean copy for each.

### Important

6. **Result cap was unspecified.**
   *Source*: objectives-challenger.
   **Resolved**: Capped at 50 results in v1. Footer note when cap is reached. No pagination.

7. **Minimum query length was implicit.**
   *Source*: derived from user-advocate's "what fires while typing" question.
   **Resolved**: Minimum 2 characters; shorter input renders idle prompt and fires no query.

8. **Aria labels and Korean copy not specified.**
   *Source*: user-advocate.
   **Resolved**: All `aria-label` strings and placeholder/helper copy specified in Korean in the proposal.

9. **Existing "No posts found" copy is English in an otherwise-Korean app.**
   *Source*: user-advocate (minor, but trivial to fix in the same PR).
   **Resolved**: Updated to "아직 작성한 글이 없습니다." as part of the change.

### Minor

10. **Server-side ranking, snippet highlighting, recent-searches history.**
    Explicitly deferred in non-goals. Accepted for v1.

11. **HTML tag false positives.**
    Only triggered if user types HTML-looking strings (e.g. `<p>`). Extremely rare for Korean writing. Accepted.

## Key Questions Raised

- Is "search" actually the right tool, or does the user really want date-based jump navigation? (objectives-challenger.)
  *Answer*: Issue #577 explicitly requests search by title and content. Date-jump is complementary, not a substitute, and is tracked separately.

- At per-user scale (low hundreds), is server-side search even needed, or can we fetch all of a user's posts once and filter client-side? (alternatives-explorer.)
  *Answer*: Server-side `ILIKE` filtered by `author_id` is simpler to reason about (no upfront fetch, no cache invalidation when posts are added), and is fast enough. Client-side could be revisited if real-world UX shows network latency dominates. For v1 we keep server-side.

- Should the input live in the header (sticky) or as an inline form below it?
  *Answer*: Header (sticky), to survive the iOS soft-keyboard layout shift and keep the input always reachable while scrolling results.

## Alternatives Considered

- **Plain `ILIKE` without trigram** — *chosen for v1*. Fast enough at per-user scope; minimum risk; no migration.
- **`pg_trgm` GIN trigram indexes** — rejected for v1, kept as a future option.
- **`to_tsvector('simple', ...)` full-text search** — rejected. Postgres `simple` dictionary does not tokenize Korean meaningfully.
- **Client-side search after one big fetch** — viable, but loses simplicity for a user with hundreds of posts and adds a different perf curve. Rejected for v1.
- **Postgres RPC with ranking** — rejected. Premature at this scale.
- **Date-jump UI / sticky month headers** instead of text search — complementary, not a replacement for the user's stated need. Out of scope.
- **Server-side returning a plain-text-stripped content column** — would be cleaner than searching raw HTML, but requires a new generated column (migration). Deferred; HTML-tag false positives accepted for v1.

## Accepted Trade-offs

- Full-`content` `ILIKE` scan reads larger rows than `content_preview`-only would have. At low-hundreds-of-rows-per-user, this is single-digit milliseconds and worth it to avoid the silent-miss-past-500-chars UX bug. If a power user reaches thousands of posts, latency grows roughly linearly — at that point add `pg_trgm` on `content`.
- No term highlighting in results (v1 deferred). Users will scan card titles/previews to confirm matches.
- 50-result cap with no pagination. If users routinely need more, switch to `useInfiniteQuery` in v2.
- HTML-string false positives accepted (rare in Korean writing).

## Revision History

- **Round 1 — 2026-05-13**: Initial proposal. Three reviewers found 5 Critical / 4 Important / 2 Minor issues. All Critical resolved by (a) switching `WHERE` to full `content`, (b) dropping `pg_trgm` migration, (c) explicit `isMyPage` scoping with defense-in-depth note, (d) sticky header + auto-focus + Escape + focus return, (e) five distinct UI states with Korean copy. All Important resolved. Minor items either resolved (Korean empty-state copy) or accepted (deferred features).
- **No second round needed**: After revision, no Critical issues remain.
