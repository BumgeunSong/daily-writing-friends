## 1. Shared utilities

- [x] 1.1 Add `escapeForOrFilter(input: string): string` to `apps/web/src/shared/api/postgrestFilters.ts` next to the existing `formatInFilter` (per design D8). Pure function; no exports beyond the function itself.
- [x] 1.2 Add `useDebouncedValue<T>(value: T, delayMs: number): T` to `apps/web/src/shared/hooks/useDebouncedValue.ts`. Uses `useState` + `useEffect` with `setTimeout` and a cleanup that clears the pending timer on dependency change or unmount.

## 2. Data layer

- [x] 2.1 Create `apps/web/src/user/api/searchUserPosts.ts` exporting `async function searchOwnPosts(userId: string, query: string, limit?: number): Promise<Post[]>`. Default `limit = 50`. Reuses `FEED_POST_SELECT` and `mapRowToPost` from `apps/web/src/post/api/post.ts`.
- [x] 2.2 Implement the Supabase query: `.from('posts').select(\`${FEED_POST_SELECT}, boards(first_day)\`).eq('author_id', userId).or(...).order('created_at', { ascending: false }).limit(limit)`. The `.or(...)` argument is built from the escaped + wildcard-wrapped query: `title.ilike.%kw%,content.ilike.%kw%`.
- [x] 2.3 On Supabase error, `console.error` and **`throw error`** (per design D3a). Do not catch and return `[]`.
- [x] 2.4 Add a top-of-file JSDoc on `searchUserPosts.ts` explaining: scope (own posts only), why `content` is in WHERE but only `content_preview` in SELECT, and the 50-row cap.

## 3. React Query hook

- [x] 3.1 Create `apps/web/src/user/hooks/useUserPostSearch.ts` exporting `useUserPostSearch(userId: string, query: string)`. Add the JSDoc `@see useUserSearch` cross-reference at the top of the file (design D11).
- [x] 3.2 Configure `useQuery` with `queryKey: ['userPostSearch', userId, query]`, `enabled: query.length >= 2`, `staleTime: 30_000`, `cacheTime: 5 * 60_000`, `keepPreviousData: true`, `onError: (e) => Sentry.captureException(e)` — *no* `extra` payload (design D3).
- [x] 3.3 Caller (the view component) is responsible for `.trim()` before passing `query` in. Document this expectation in the hook's JSDoc.

## 4. View components

- [x] 4.1 Create `apps/web/src/user/components/UserPostSearchInput.tsx`. Controlled `<input>` with `maxLength={100}`, `inputMode="search"`, `enterKeyHint="search"`, `aria-label="내 글 검색어"`. Auto-focuses on mount. Local immediate state; uses `useDebouncedValue` to compute a debounced value (300 ms); emits `onDebouncedChange(debounced)` to the parent.
- [x] 4.2 Create the pure helper `deriveSearchState(query: string, result: { isFetching: boolean; isError: boolean; data?: Post[] }): 'idle' | 'loading' | 'empty' | 'results' | 'error'`. The second arg is a **plain shape**, not the React Query `UseQueryResult` type — keeps the helper unit-testable as pure input/output. The view callsite reads the React Query result and forwards only those three fields. Evaluation order per design D7. Export from the same file as the view, or sibling util.
- [x] 4.3 Create `apps/web/src/user/components/UserPostSearchView.tsx`. Owns the input value, debounced value, and the trimmed query passed to the hook. Renders the input plus the five-state body. Reuses `PostItem` and `PostItemSkeleton` from `UserPostItem` for results/loading; renders the exact Korean copy specified in the spec for idle / empty / error / cap notice.
- [x] 4.4 Wire keyboard handling: Escape on the input invokes the parent's `onExitSearch` callback (provided by `UserPage`).

## 5. Page and header wiring

- [x] 5.1 Update `apps/web/src/user/components/UserPage.tsx`: add `const [isSearchMode, setIsSearchMode] = useState(false)`. Pass `isSearchMode` + `onToggleSearch={() => setIsSearchMode(v => !v)}` to `UserPageHeader`. When `isSearchMode`, render `<UserPostSearchView userId={userId} onExitSearch={() => setIsSearchMode(false)} />` instead of `<UserProfile>` + `<UserPostsList>`.
- [x] 5.2 Update `apps/web/src/user/components/UserPageHeader.tsx`: extend the props with `isMyPage`, `isSearchMode`, `onToggleSearch`. When `isMyPage && !isSearchMode`, render an additional search icon button (lucide-react `Search`) with `aria-label="내 글 검색"` and `aria-pressed={isSearchMode}` to the right of the existing title / left of settings icon.
- [x] 5.3 When `isMyPage && isSearchMode`, swap the header content for: back/close button (lucide-react `X` or `ChevronLeft`, `aria-label="검색 닫기"`) + the `UserPostSearchView`'s input. Apply `sticky top-0 z-10 bg-background` only in search mode. *(Implementation: UserPageHeader returns null while in search mode; UserPostSearchView renders its own sticky chrome with the close button and input, achieving the same user-visible swap.)*
- [x] 5.4 Other users' pages (`!isMyPage`) keep returning `null` from the header — unchanged.
- [x] 5.5 On exit (close button or Escape), call `onToggleSearch` from the header, and move focus back to the search icon button (`useRef` + `.focus()` after the state update).

## 6. Copy cleanup

- [x] 6.1 In `apps/web/src/user/components/UserPostList.tsx` change the empty-state copy "No posts found" to "아직 작성한 글이 없습니다." for app-wide Korean consistency (called out in proposal review).

## 7. Sanity checks before opening the PR

- [x] 7.1 `pnpm --filter web type-check` passes.
- [x] 7.2 `pnpm --filter web lint` passes. *(0 errors in new/modified files; lint command reports 7 pre-existing errors and ~393 warnings from unrelated files. Newly added files contribute 0 errors and 3 style warnings — the array-index-key warning matches the established `UserPostList.tsx:35` pattern, and the `max-lines-per-function` is a soft style preference.)*
- [ ] 7.3 Manual smoke against local dev server + local Supabase: open own user page → search icon visible → enter mode → 2-char Korean query → results render → click result → detail page → back → search mode reset. Open another user's page → no search icon.

## Tests

Per `openspec/VERIFICATION_CONFIG.md`: **Vitest** runs Unit tests; **agent-browser** runs E2E (with **dev3000** for timeline capture); **Supabase local Docker** provides the DB for E2E. Per the testing skill: the imperative shell — hooks, components, API/Supabase calls — is **not** unit- or integration-tested in isolation; their behavior is covered end-to-end. Only pure functions get unit tests.

### Unit (pure functions only)

- [x] T.1 **Vitest**: `apps/web/src/shared/api/__tests__/postgrestFilters.test.ts` — `escapeForOrFilter` is a pure `(string) → string`. Cases: empty, plain ASCII, plain Korean, each of `\` `%` `_` `,` `(` `)` `*` `"` `:` `.` `\n` `\t` in isolation, mixed Korean + wildcards, leading/trailing whitespace (preserved at this layer — trimming happens upstream), and the injection-attempt fixture string `,author_id.eq.00000000-0000-0000-0000-000000000000` whose escaped form MUST NOT produce a parseable second filter clause.
- [x] T.2 **Vitest**: `apps/web/src/user/components/__tests__/deriveSearchState.test.ts` — `deriveSearchState(query, { isFetching, isError, data? })` is a pure `(string, plain-shape) → union`. Cover: all five terminal states; the evaluation-order property (idle gate wins over previous `data` — the `keepPreviousData` regression guard); the `isError` branch winning over `isFetching`; the `keepPreviousData` mid-typing case (`isFetching: true` with prior `data` returns `'results'`, not `'loading'`).

### Excluded from Unit (imperative shell — covered end-to-end)

Per the testing skill, the following are **not** unit-tested. Their behavior is verified by E2E flows that exercise them in situ:

- `useDebouncedValue` (timing semantics are `setTimeout` — covered by E2E "results appear ~300 ms after typing stops").
- `useUserPostSearch` (React Query hook — covered by E2E flows that exercise gating, caching, error UI).
- `UserPostSearchView` and `UserPostSearchInput` (components — covered by E2E flows over all five states and the transition).
- `searchOwnPosts` (Supabase API call — covered by E2E flows including the past-500-chars boundary fixture).

### E2E

E2E tests use **agent-browser** + **dev3000** against `pnpm --filter web dev` + **Supabase local Docker** (signed-in as a seeded user with the user-auth client, never service-role). Shared seed fixture for every test in this section:

- User A: baseline posts plus
  - one post with body length exactly 1500 chars and literal `BODYNEEDLE` starting at offset exactly 1000;
  - 60 posts whose titles contain `LIMITNEEDLE`;
  - one post titled "오늘의 작성".
- User B: at least one post with the user-A-unique phrase `ALPHA_ONLY` and at least one `visibility='private'` post.

Tests:

- [ ] T.3 **Happy path on own page (desktop viewport)**: sign in as user A, open `/user`, assert search icon present, click it, assert header becomes sticky + input focused + settings hidden, type "오늘" (Korean 2-char substring), assert results render after ~300 ms and the "오늘의 작성" post is among them, click a result, assert navigation to the post detail page, press browser back, assert search mode is reset (regular profile + list re-rendered). This also exercises `useDebouncedValue` (300 ms timing) and `useUserPostSearch` (enabled-gating + happy data path).
- [ ] T.4 **Match past 500-char preview boundary**: in search mode, type `BODYNEEDLE`; assert the 1500-char-body post appears in the results. This verifies the API's `content.ilike` reaches past `content_preview`.
- [ ] T.5 **50-result cap with newest-first ordering**: type `LIMITNEEDLE`; assert exactly 50 result cards render, the cap-notice footer "최근 50개까지만 표시됩니다…" is visible, and the visible `created_at`s are non-increasing top to bottom (oldest 10 `LIMITNEEDLE` posts must be absent).
- [ ] T.6 **Cross-user isolation (no leak from search)**: as user A, type `ALPHA_ONLY` (user B's unique phrase); assert zero results. Confirms the API's unconditional `eq('author_id', userId)` filter plus RLS prevent cross-user matches.
- [ ] T.7 **Mobile viewport keyboard**: iPhone-class UA + 390×844 viewport with simulated virtual keyboard. Enter search mode, focus the input, show keyboard, assert the input remains within the visible viewport. Verifies the sticky-header + `inputMode="search"` decisions.
- [ ] T.8 **Empty state**: type a string that matches nothing, assert "'<query>'에 일치하는 글이 없습니다." rendered.
- [ ] T.9 **Escape-to-exit**: enter search mode, press Escape; assert search closes and `document.activeElement` is the search icon button.
- [ ] T.10 **Other user's page**: navigate to `/user/<user-B-id>` as user A; assert no search icon, no input, header is unchanged from current behavior.
- [ ] T.11 **RLS defense-in-depth (Layer 4 security contract)**: while signed in as user A with the user-auth client (NOT service-role), invoke `searchOwnPosts(<user-B-id>, 'ALPHA_ONLY')` directly from the browser console (or via a small test hook). Assert the result is either zero rows or only user B's `visibility = 'public'` posts; never B's private posts. This is the load-bearing security check for the "search my posts only" invariant — kept in E2E so RLS fires for real, not via Vitest mocks.

## 8. Out of scope (do NOT implement in this change)

- [ ] 8.1 Do not add a `pg_trgm` migration or any new database object.
- [ ] 8.2 Do not add term highlighting, recent-searches history, date filters, or pagination beyond 50 results.
- [ ] 8.3 Do not refactor `useUserSearch` to `useUserLookup` in this PR.
- [ ] 8.4 Do not add `['userPostSearch', ...]` invalidation to `postCacheUtils` in this PR.
