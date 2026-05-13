## Why

User page currently only shows the latest posts via infinite scroll, so finding an older post — e.g. to reference previous writing — requires endless scrolling. Users want to quickly locate their own past posts by keyword (title or body) to revisit or build on prior writing. Korean is the primary search language.

Tracking issue: [#577](https://github.com/BumgeunSong/daily-writing-friends/issues/577).

## What Changes

### Frontend behavior

- Add a **search icon button** to `UserPageHeader`, visible **only on the user's own page** (`isMyPage === true`). Other users' user pages are unchanged — no search affordance at all.
- Clicking the icon enters **search mode**: the header transforms in place to show a back/close button + a text input (existing "내 프로필" title is hidden while in search mode). The header becomes **sticky** in search mode (`sticky top-0 z-10`) so it stays visible while results scroll.
- The input is **auto-focused** on entering search mode (mobile keyboard opens immediately). On submit/Enter or after debounce, search fires.
- **Exit search mode** is triggered by: the back button, pressing `Escape`, or `aria-pressed` toggle of the search icon. On exit, focus returns to the search icon button, and the regular `UserPostsList` (infinite scroll) is restored unchanged.
- **Debounce** typing at 300 ms before sending the query.
- **Minimum query length**: 2 characters. Shorter input renders the idle prompt and fires no query.
- **States** rendered below the input:
  - *Idle* (mode active, query < 2 chars): prompt text "내가 쓴 글에서 제목 또는 내용으로 검색하세요" + helper "제목과 본문에서 일치하는 글을 찾습니다."
  - *Loading* (query ≥ 2 chars, request in flight): skeleton list reusing `PostItemSkeleton`.
  - *Results*: list of `PostItem` cards (same component as the feed) ordered by `created_at DESC`. Cap at **50 results** (no pagination in v1); show a footer note when the cap is reached: "최근 50개까지만 표시됩니다. 검색어를 더 구체적으로 입력해보세요."
  - *Empty*: "'<query>'에 일치하는 글이 없습니다."
  - *Error*: "검색 중 문제가 발생했습니다. 다시 시도해주세요." + Sentry capture.
- **Accessibility**: search icon button `aria-label="내 글 검색"`, `aria-pressed` reflects search-mode state; input has `aria-label="내 글 검색어"`, `inputMode="search"`, `enterKeyHint="search"`; close button `aria-label="검색 닫기"`.
- **Mobile keyboard**: input is placed in the sticky header so it cannot be hidden by keyboard reflow; we do not need a custom keyboard-inset hook for v1.
- **Match highlighting in results** is out of scope for v1 (deferred).
- **Recent searches / search history** is out of scope for v1 (deferred).

### Data layer

- New API: `searchOwnPosts(userId, query, limit = 50)` in `apps/web/src/user/api/searchUserPosts.ts`. Uses Supabase `.from('posts').select(FEED_POST_SELECT, boards(first_day)).eq('author_id', userId).or('title.ilike.%kw%,content.ilike.%kw%').order('created_at', { ascending: false }).limit(50)`.
- **Search field choice**: match against `title` and the **full `content`** column (HTML included) in the `WHERE` clause, but the `SELECT` only returns `content_preview` (existing 500-char generated column). This lets users find phrases anywhere in a post while keeping response payload small. Rationale: `content_preview` alone would silently miss matches past the first ~500 characters of HTML, which is unacceptable for a writing app where posts are routinely 1–3 KB.
- New hook: `useUserPostSearch(userId, query)` in `apps/web/src/user/hooks/useUserPostSearch.ts`, using `useQuery` (not `useInfiniteQuery` — v1 is capped). `enabled: query.length >= 2`, `staleTime: 30_000`, `keepPreviousData: true` to avoid flicker between keystrokes.
- The query input is sanitized: ILIKE pattern metacharacters `%` and `_` and the escape char `\` are escaped before being interpolated into the `ilike` filter. (Per-user RLS still applies; this just avoids unintended wildcard expansion.)
- **No database migration** in v1. The existing `idx_posts_author_created` composite index narrows the scan to a single user's rows before the `ILIKE` runs, which is fast enough at the expected per-user scale (low hundreds of posts, single-digit ms in informal testing). A future `pg_trgm` GIN index can be added later if/when search is broadened or per-user counts grow.

Non-goals (deferred):
- Server-side ranking / fuzzy match / morpheme-aware Korean tokenization.
- Search across other users' posts.
- Filters (date range, board, etc.) and date-jump navigation. (Tracked separately if requested.)
- Result-snippet generation and term highlighting.
- Recent-searches history.

## Capabilities

### New Capabilities
- `user-post-search`: Lets a logged-in user search their own past posts on their own user page by title or content (substring match, Korean-friendly), returning up to 50 most-recent matching posts as cards.

### Modified Capabilities
<!-- None. There is no existing spec for the user page or post listing under openspec/specs/. This is the first capability spec touching this surface. -->

## Impact

**Code**
- `apps/web/src/user/components/UserPage.tsx` — host `isSearchMode` state; render `UserPostSearchView` when active, otherwise `UserPostsList`. Hide `UserProfile` while in search mode to maximize results space.
- `apps/web/src/user/components/UserPageHeader.tsx` — add `onToggleSearch` prop + search icon button (own page only); when in search mode, render the input/back-button form instead of the title + settings icon.
- New: `apps/web/src/user/components/UserPostSearchView.tsx` — orchestrates idle / loading / results / empty / error states.
- New: `apps/web/src/user/components/UserPostSearchInput.tsx` — controlled, debounced input (uses an internal local state + `useDeferredValue` or a small debounce hook).
- New: `apps/web/src/user/hooks/useUserPostSearch.ts` — React Query hook.
- New: `apps/web/src/user/api/searchUserPosts.ts` — Supabase query.
- Update: `apps/web/src/user/components/UserPostList.tsx` — change the existing empty copy "No posts found" → "아직 작성한 글이 없습니다." (consistency with the rest of the app's Korean copy; spotted during review).

**Database**
- None in v1.

**Dependencies**
- No new npm packages.

**Testing**
- Vitest unit tests for ILIKE escape util.
- Component test for `UserPostSearchView` covering all five states (idle / loading / results / empty / error).
- Integration test against local Supabase verifying `.or('title.ilike,content.ilike')` returns only own posts and respects the 50-row cap.

**Risks**
- Full `content` rows can be large (a few KB each) and the `WHERE content ILIKE` scan reads them even though we don't return them. At ~few-hundred rows per user this is still fast, but if a power user reaches thousands of posts the latency will grow linearly. Mitigation path: add `pg_trgm` GIN on `content` later — out of scope now.
- HTML tags inside `content` (e.g. `<p>`, `<strong>`) can cause false positives only when the user types HTML-looking strings (extremely rare for Korean writing). Accepted.
- Hiding search on other users' pages is enforced both client-side (`isMyPage` guard) and at the data layer (the API always sets `eq('author_id', userId)` — even if a client called it with another userId, RLS plus our header guard prevent cross-user leak). The capability spec must state this invariant.
