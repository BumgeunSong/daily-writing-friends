## Context

`UserPage` (`apps/web/src/user/components/UserPage.tsx`) is the user's profile screen. On their own page it shows `UserProfile` + `UserPostsList` (infinite scroll of their posts, paged via `useUserPosts` → `useInfiniteQuery`, 10 per page, cursor-based on `created_at`). The header (`UserPageHeader`) shows "내 프로필" + a settings menu icon on own page; nothing on others' pages.

Posts live in Supabase Postgres. Relevant columns on `posts`:
- `title TEXT NOT NULL`
- `content TEXT NOT NULL DEFAULT ''` — HTML
- `content_preview TEXT GENERATED ALWAYS AS (LEFT(content, 500)) STORED` — used by feed `SELECT`s to reduce egress
- `author_id`, `created_at`, plus engagement counters

Indexes:
- `idx_posts_author_created` on `(author_id, created_at DESC)` — narrows scans to one user's posts.
- No full-text, no trigram, no GIN.

Korean is the primary search language. Each user is expected to have at most a few hundred posts of their own.

The proposal (revised after review) settled on: `ILIKE` server-side, scope to `author_id = userId`, search both `title` and full `content` in `WHERE` but `SELECT` only the preview, capped at 50 results, no migration, no infinite scroll for v1.

## Goals / Non-Goals

**Goals:**
- Let a logged-in user search their own past posts on their own user page by title or body keyword (Korean substring), and click into a matching post.
- Reuse existing card UI (`UserPostItem` / `PostItem`) so search results look identical to the feed list.
- Don't regress existing `UserPostsList` infinite scroll behavior; search is a separate mode toggled from the header.
- Be testable at the right layers: pure utils unit-tested; the Supabase query integration-tested against the local stack; the search-mode UX exercised end-to-end via agent-browser.
- Ship without a database migration.

**Non-Goals:**
- Server-side ranking, fuzzy match, morpheme tokenization.
- Cross-user search.
- Date/board filter UI, term highlighting, recent-searches history, pagination beyond 50 results.
- Performance optimization for thousands-of-posts power users (deferred until needed).

## Decisions

### D1 — Search backend: `ILIKE` on `title` + full `content`, scoped by `author_id`

**Decision.** API runs:
```ts
supabase
  .from('posts')
  .select(`${FEED_POST_SELECT}, boards(first_day)`)
  .eq('author_id', userId)
  .or(`title.ilike.${pattern},content.ilike.${pattern}`)
  .order('created_at', { ascending: false })
  .limit(50);
```
where `pattern = `*${escapeForOrFilter(query)}*`` is built by the API function and `escapeForOrFilter` is **the single source of truth** for both ILIKE wildcard escaping (`%`, `_`, `\`) and PostgREST `.or()` filter-string escaping (`,`, `(`, `)`, `*`, `"`, `:`, `.`, newline). See D8 for the exact spec; D1 and D8 must agree.

**Alternatives considered.**
- `content_preview` only — *rejected*: silently misses matches past ~500 raw-HTML chars. (Proposal-review Critical #1.)
- `pg_trgm` GIN trigram indexes — *rejected for v1*: over-engineered at per-user scale; new extension; migration risk. (Proposal-review Critical #2.) Documented as a future option if needed.
- `to_tsvector('simple')` full-text — *rejected*: does not tokenize Korean.
- Client-side filter after bulk fetch — *rejected for v1*: simpler reasoning model with server-side; fetch cost and cache-invalidation complexity for new posts.

**Rationale.** The `idx_posts_author_created` index narrows to one user's rows before the `ILIKE` runs. At low-hundreds rows per user, sequential `ILIKE` is single-digit milliseconds. Defense in depth on user scoping: `eq('author_id', userId)` in the query + RLS on the `posts` table + UI guard (`isMyPage`).

### D2 — Search field: full `content` in `WHERE`, `content_preview` in `SELECT`

**Decision.** WHERE filters against `content` (full HTML). SELECT continues to use `FEED_POST_SELECT` which includes `content_preview`, not `content`, keeping response payload small (~same as the existing feed query).

**Trade-off.** The DB engine still has to read full `content` rows to evaluate `ILIKE`. At a few hundred rows totalling maybe a few hundred KB, this is acceptable. If per-user counts grow past a few thousand, we revisit (likely adding `pg_trgm` GIN on `content`).

### D3 — Hook shape: `useQuery`, not `useInfiniteQuery`

**Decision.** `useUserPostSearch(userId, query)` returns a `useQuery<Post[]>` instance:
- The hook expects `query` to be **already trimmed** by the caller. The `UserPostSearchView` applies `.trim()` to the debounced value before passing it in. This avoids two definitions of "the query."
- `queryKey: ['userPostSearch', userId, query]`
- `enabled: query.length >= 2` — "2" means **2 JS `String.length` code units**, which equals 2 Hangul syllables, 2 Latin chars, or 2 emoji-halves. One Hangul syllable (`글`) is intentionally below the threshold to avoid match-everything queries; users who want single-syllable matches must pair them with another character. Accepted trade-off.
- `staleTime: 30_000` (30 s)
- `cacheTime: 5 * 60_000`
- `keepPreviousData: true` — prevents flicker between keystrokes while a new query is in flight. **Crucially**, the `deriveSearchState` function must check `query.length < 2` *before* it ever reads `data`, otherwise `keepPreviousData` will leak stale results into the idle state. State evaluation order is documented in D7.
- `onError`: `Sentry.captureException(error)` only. **Do not** attach the raw query string as `extra` context — risk of PII (user typed a name, phone number, etc.). Matches the existing pattern in `useUserPosts.ts:34`.
- **Cache invalidation on post create/edit**: *not added in v1*. Existing `postCacheUtils.ts` invalidates `['posts', boardId]` and `['userPostings', authorId]` but not `['userPostSearch', ...]`. Within v1's 30 s `staleTime`, a user who just published a post and then searches for it may not see it for up to 30 s. Accepted because (a) search is ephemeral and the user must explicitly enter search mode, (b) the user can refine the query to force a new request, and (c) the search-immediately-after-create path is uncommon. If feedback shows it matters, add `['userPostSearch']` prefix invalidation to `postCacheUtils`.

**Alternatives.** `useInfiniteQuery` would mirror `useUserPosts` but is unnecessary since v1 is capped at 50 results.

### D3a — `searchOwnPosts` throws on error (does not silently return `[]`)

**Decision.** The API function follows the `fetchRecentPostsFromSupabase` / `fetchBestPostsFromSupabase` pattern in `apps/web/src/post/api/post.ts:109-110`:
```ts
if (error) {
  console.error('Supabase searchOwnPosts error:', error);
  throw error;
}
```
**Do not mirror** the `fetchUserPostsFromSupabase` pattern at `apps/web/src/user/hooks/useUserPosts.ts:65-68`, which catches the error and returns `[]`. That pattern would prevent React Query from ever entering the error state, so the *Error* branch in D7 would be dead code. Architecture-reviewer caught this.

### D4 — Debounce inside the input component, not in the hook

**Decision.** `UserPostSearchInput` keeps a local `value` (immediate echo for the user as they type) and reports a debounced value upward via a shared `useDebouncedValue` hook. `UserPostSearchView` then `trim()`s the debounced value and passes it to the search hook.

We will add a tiny utility hook `useDebouncedValue<T>(value: T, delayMs: number): T` in `apps/web/src/shared/hooks/useDebouncedValue.ts` (none exists today — `useDebounce*` returned no matches). Implementation: `useState` + `useEffect` with `setTimeout` + cleanup on dependency change. Pure timing semantics — directly unit-testable with `vi.useFakeTimers`.

**Input constraints.** The `<input>` element gets `maxLength={100}` to prevent absurd paste payloads. We also strip leading/trailing whitespace as part of the `.trim()` step before the search fires.

**Proposal alignment fix.** The proposal previously said the input "uses an internal local state + `useDeferredValue` or a small debounce hook." This design supersedes that: the input uses `useDebouncedValue`, not `useDeferredValue`. Update the proposal in the same PR to match.

**Alternatives.** `useDeferredValue` — does not give a hard delay (yields to React's idle priority instead). Less predictable than a fixed 300 ms debounce for network requests.

### D5 — Search mode lives as local state in `UserPage`, not in URL

**Decision.** `UserPage` owns `const [isSearchMode, setIsSearchMode] = useState(false)`. Toggling the header search icon flips it; entering search mode swaps `UserProfile` + `UserPostsList` for `UserPostSearchView`. `UserPageHeader` receives `isSearchMode` + `onToggleSearch` and renders the appropriate header content.

**Alternatives.**
- URL query param `?search=foo` — *rejected for v1*: search-results are ephemeral; reload-from-URL semantics and back-button behavior add complexity for marginal gain. Can be added if users ask to share search URLs.
- Lifting search query into URL — same.

### D6 — Header rendering in search mode

**Decision.** `UserPageHeader` renders two variants:
- *Normal* (today): "내 프로필" + settings icon + new search icon (own page only).
- *Search mode*: back/close icon (left) + `UserPostSearchInput` (flex-1) — fills the header row. Settings icon hidden in search mode.

When in search mode the header becomes `sticky top-0 z-10 bg-background` so it stays anchored as results scroll. Outside search mode it remains `static` (no visual change today).

### D7 — Five-state rendering in `UserPostSearchView`

**Decision.** A single pure function `deriveSearchState(query, queryResult)` returns one of `'idle' | 'loading' | 'empty' | 'results' | 'error'`. **Evaluation order is contractual** and must be implemented in this exact order so the `keepPreviousData` cache from a previous query does not bleed into the idle state when the user clears the input:

```
1. if (query.length < 2)          return 'idle';
2. if (queryResult.isError)       return 'error';
3. if (queryResult.isFetching && !queryResult.data) return 'loading';
4. if (queryResult.data?.length === 0) return 'empty';
5. return 'results';
```

`deriveSearchState` is exported from `UserPostSearchView.tsx` (or a sibling util file) as a pure function so it can be unit-tested without rendering.

| State | UI |
|---|---|
| `'idle'` | Prompt text "내가 쓴 글에서 제목 또는 내용으로 검색하세요" + helper "제목과 본문에서 일치하는 글을 찾습니다." |
| `'loading'` | 5× `PostItemSkeleton` |
| `'empty'` | "'<query>'에 일치하는 글이 없습니다." |
| `'results'` | List of `PostItem`s; footer "최근 50개까지만 표시됩니다. 검색어를 더 구체적으로 입력해보세요." when `data.length === 50` |
| `'error'` | "검색 중 문제가 발생했습니다. 다시 시도해주세요." (Sentry capture happens in the hook's `onError`) |

### D8 — Input sanitization helper (single source of truth)

**Decision.** A single pure function `escapeForOrFilter(input: string): string` lives in `apps/web/src/shared/api/postgrestFilters.ts` (next to the existing `formatInFilter`). It is the **only** place that knows how to make a user-supplied keyword safe to drop into a `.or('title.ilike.<value>,content.ilike.<value>')` call. The caller wraps the returned token with `%` wildcards.

**Spec.** In this order:

1. Escape SQL-LIKE wildcards by prefixing with `\`: `\` → `\\`, then `%` → `\%`, then `_` → `\_`. (PostgREST passes the value through to Postgres `ILIKE`; Postgres uses `\` as the default escape character.)
2. **PostgREST `.or()` value-segment escaping.** The Supabase JS client, as of `@supabase/postgrest-js` used here, builds the `or=` URL parameter by concatenating filter clauses with literal commas. It does **not** percent-encode commas, parens, asterisks, dots, colons, or quotes that appear inside the value, so any of those in a user keyword can change the parsed grammar. We URL-percent-encode the following set in the value portion: `,` `(` `)` `*` `"` `:` `.` and any whitespace (including newlines/tabs). This matches PostgREST's documented reserved characters for filter values.
3. The result is wrapped with `%…%` by the caller (`searchOwnPosts`), then interpolated into the `.or()` string.

**Verification.** Unit tests cover: empty input, Korean-only, mixed Korean + ASCII, each of `\` `%` `_` `,` `(` `)` `*` `"` `:` `.` `\n` `\t`, a long random string, and a pathological attempt to inject `,author_id.eq.OTHER_UUID`. We assert byte-for-byte expected output; we also assert that the resulting query against local Supabase returns only the signed-in user's posts (defense-in-depth: even if escaping is wrong, RLS + the unconditional `.eq('author_id', userId)` prevent cross-user leak).

**Why shared (not feature-local).** A future board-search or draft-search will need the same escape function. `postgrestFilters.ts` is already the home for PostgREST helpers in this codebase; putting it there from day one avoids a predictable extract-and-move refactor later.

### D9 — Scoping invariant enforced in 3 places

**Decision.**
1. UI: search icon button only rendered when `isMyPage`.
2. API: `.eq('author_id', userId)` is unconditional in the query builder.
3. DB: RLS on `posts` already restricts SELECT to public posts or owned posts; nothing changes here.

Capability spec must state this layering.

### D10 — Reuse the existing `PostItem` from `UserPostItem.tsx`

**Decision.** Search results render the `PostItem` component exported from `apps/web/src/user/components/UserPostItem.tsx` — the same component `UserPostList` already uses. This keeps card visuals identical to the feed list. (Naming note: the file is `UserPostItem.tsx`, but the named export is `PostItem` + `PostItemSkeleton`. Implementer should `import { PostItem, PostItemSkeleton } from '@/user/components/UserPostItem'`.)

### D11 — Naming collision with existing `useUserSearch`

**Note.** `apps/web/src/user/hooks/useUserSearch.ts` already exists and searches for **users** (by nickname/email). The new `useUserPostSearch` searches a **user's posts**. The names are similar enough to confuse a grep or auto-import.

**Decision for v1.** Keep both names but require a top-of-file JSDoc on `useUserPostSearch.ts`:
```ts
/**
 * Search the given user's own posts by title or content.
 * @see useUserSearch — searches FOR users by name/email (different feature).
 */
```
Renaming `useUserSearch` → `useUserLookup` (single consumer in `BlockedUsersPage.tsx`) would be cleaner but expands this change's blast radius. Tracked as a follow-up if anyone hits the confusion.

## Risks / Trade-offs

- **[Risk] Power user with thousands of posts has slow search** → *Mitigation*: monitor via Sentry breadcrumbs (query duration). If we see >300 ms p95, add `pg_trgm` GIN index on `content` in a follow-up migration.
- **[Risk] HTML tags inside `content` cause false-positive matches when user types `<p>` etc.** → *Mitigation*: vanishingly rare for Korean prose. Accepted. Mention in spec.
- **[Risk] PostgREST `.or()` parameter injection via unescaped user input** → *Mitigation*: `escapeIlikePattern` + value-encode any PostgREST-meta chars in the user portion. Unit-tested. RLS still scopes to the user even on pathological input.
- **[Risk] iOS keyboard reflow occludes the input** → *Mitigation*: sticky header in search mode, `inputMode="search"`, `enterKeyHint="search"`. Verified via agent-browser E2E.
- **[Risk] User types fast → many in-flight requests** → *Mitigation*: 300 ms debounce + `keepPreviousData` to avoid visible flicker; React Query coalesces same-key requests.
- **[Trade-off] Single 50-result cap, no pagination** → *Accepted for v1*. Footer message gives users a path forward (refine query).
- **[Trade-off] No URL state** → *Accepted*. Easy to add later without changing the API or the hook.

## Migration Plan

No database migration. Rollout is purely frontend + a new client-only API module:

1. Land the change behind no flag (low-risk surface; gated by `isMyPage`).
2. Verify in staging: own user page renders new search icon; other users' pages unchanged.
3. Sentry breadcrumbs in `useUserPostSearch.onError` for visibility into real-world failures.
4. **Rollback**: revert the PR. No DB cleanup needed.

If a future iteration adds `pg_trgm`, that migration is independent and additive (safe to apply without touching this code).

## Open Questions

1. Should the search icon on own page have an unread/onboarding nudge for the first month? — *Tentative answer: no, ship cleanly first; revisit if analytics show low discovery.*
2. When the user navigates from a search result to a post detail and then hits back, should we restore search mode + the previous query? — *Tentative answer: nice-to-have, but it requires URL state or a session ref. Defer to v2.*

## Testability Notes

Tools (per `openspec/VERIFICATION_CONFIG.md`): **Vitest** for Unit, **agent-browser** for E2E, **dev3000** for timeline capture, **Supabase local Docker** for E2E DB.

**Test philosophy** (per the project's testing skill at `.claude/skills/testing/SKILL.md`): test pure functions with output-based assertions at the Unit layer; cover the imperative shell (hooks, components, API/Supabase calls, browser side effects) end-to-end. No `renderHook`, no `render(...)` in unit tests, no mocked time, no mocked Supabase. This change therefore uses **two** layers, not four.

### Unit (Layer 1 — pure functions only)

Pure-logic targets with branching / edge cases — all run with Vitest, no DOM, no network, no fake timers:

- **`escapeForOrFilter`** — pure `(string) → string` — `apps/web/src/shared/api/__tests__/postgrestFilters.test.ts`
  - Cases: empty string, plain ASCII, plain Korean, each of `\` `%` `_` `,` `(` `)` `*` `"` `:` `.` and whitespace/newline/tab in isolation, mixed Korean + wildcards, leading/trailing whitespace (preserved at this layer; trimming happens upstream), and the pathological injection attempt (`,author_id.eq.OTHER_UUID`) — assert it does not produce a parseable second filter.
- **`deriveSearchState`** — pure `(string, { isFetching, isError, data? }) → union` — `apps/web/src/user/components/__tests__/deriveSearchState.test.ts`. The function takes a plain shape, not the React Query `UseQueryResult` type, so the test passes plain objects with no React Query / no `renderHook`.
  - All five terminal states asserted by their unique input combo.
  - **Evaluation order**: `query.length < 2` returns `'idle'` even when `data` has previous results (the `keepPreviousData` regression-guard test).
  - `isError` returns `'error'` even when `isFetching` is also true.
  - `isFetching` with no `data` returns `'loading'`; `isFetching` *with* previous `data` (the `keepPreviousData` mid-typing case) returns `'results'` (stale results are intentionally shown).

### Excluded from Unit / Integration (imperative shell)

Per the testing skill, the following are **not** unit- or integration-tested in isolation. Their behavior is covered by E2E flows that exercise them in situ. This trades a small loss in regression-locality for adherence to the project-wide functional-core / imperative-shell discipline.

| Excluded target | Why it's imperative shell | How E2E covers it |
|---|---|---|
| `useDebouncedValue` | `setTimeout` semantics | T.3 asserts "results render after ~300 ms" |
| `useUserPostSearch` | React Query hook | T.3/T.4/T.6/T.8 exercise gating, caching, happy & error paths |
| `UserPostSearchInput` / `UserPostSearchView` | Components with DOM side effects | T.3 + T.7 + T.8 + T.9 cover the five states and transitions |
| `searchOwnPosts` | Supabase API call | T.3/T.4/T.5/T.6/T.11 exercise it including the past-500-chars boundary |

### E2E (agent-browser + dev3000 + local Supabase)

Every imperative-shell behavior is verified end-to-end with the real Vite dev server, real local Supabase (Docker), and the user-auth client signed in as a seeded user (**never** the service-role key, so RLS fires for real). dev3000 captures timelines on failure. Tasks.md (T.3–T.11) enumerates the concrete tests; the testable behaviors they collectively cover:

- **Happy-path flow + 300 ms debounce** (search icon → search mode → typed 2-char Korean query → results appear after ~300 ms → click result → detail page → back resets search mode).
- **Past-500-char content match** via a seeded 1500-char body with literal `BODYNEEDLE` at offset 1000 (proves `content.ilike` reaches past `content_preview`).
- **50-result cap + newest-first ordering** via 60 seeded posts titled with `LIMITNEEDLE` (cap notice rendered, ordering monotone, oldest 10 absent).
- **Cross-user isolation** via a user-B-unique phrase searched while signed in as user A (zero results).
- **Mobile viewport + virtual keyboard** (390×844) — input stays in view; verifies sticky-header + `inputMode="search"`.
- **Empty state** copy.
- **Escape-to-exit + focus return** to the search icon button.
- **Other-user's page** has no search affordance at all.
- **RLS defense-in-depth (Layer-4 contract)** — invoke `searchOwnPosts(<user-B-id>, …)` from the browser with user A's session; assert zero rows or only B's public posts. Never B's private posts.

### Informational baseline (not automated)

Run `EXPLAIN ANALYZE` on the production query once before merge and record in the PR description that it uses `idx_posts_author_created`. If a future change introduces `pg_trgm`, re-run.
