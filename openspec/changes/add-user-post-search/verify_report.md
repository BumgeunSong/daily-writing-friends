# Verification Report — add-user-post-search

Generated: 2026-05-13. Layer 4 executed via agent-browser + local Supabase Docker (no dev3000).

## Summary

| Layer | Total | Passed | Failed |
|-------|-------|--------|--------|
| Unit (Layer 1)                 | 27 | 27 | 0 |
| Integration (Layer 2)          |  — |  — | — (N/A by design) |
| E2E Network Passthrough (L3)   |  — |  — | — (N/A — Supabase-direct stack) |
| E2E Local DB (Layer 4)         |  8 |  8 | 0 |

E2E coverage: 8 of 9 planned paths executed. T.7 (mobile viewport keyboard) was not executed in this run — left as a follow-up since it requires an iOS device profile (`agent-browser -p ios`); the underlying behaviors (`inputMode="search"`, sticky header, `enterKeyHint="search"`) are wired in source.

## State Model

See [verify/state_model.json](./verify/state_model.json). 9 states, 11 transitions, extracted from `specs/user-post-search/spec.md`.

## Test Paths

See [verify/test_paths.json](./verify/test_paths.json). 9 paths (T.3–T.11) provide Transition Coverage over the state model.

## Layer 1 — Unit (Vitest, 27/27 pass)

Command: `pnpm --filter web test:run src/shared/api/__tests__/postgrestFilters.test.ts src/user/components/__tests__/deriveSearchState.test.ts`

```
✓ src/user/components/__tests__/deriveSearchState.test.ts  (8 tests)
✓ src/shared/api/__tests__/postgrestFilters.test.ts        (19 tests)

Test Files  2 passed (2)
     Tests  27 passed (27)
```

- `escapeForOrFilter` — 19 cases including empty, ASCII, Korean, each reserved char (`\` `%` `_` `,` `(` `)` `*` `"` `:` `.` `\n` `\t`), mixed Korean + wildcards, whitespace preserved, injection-attempt fixture (`,author_id.eq.<uuid>` asserted to encode the leading `,` to `%2C` and all `.` to `%2E`).
- `deriveSearchState` — 8 cases including all five terminal states, idle-gate-wins-over-cached-data, error-wins-over-fetching, `keepPreviousData` mid-typing returns `'results'` not `'loading'`.

Type-check: `pnpm --filter web type-check` → clean.
Lint (new/modified files): **0 errors, 3 style warnings** consistent with existing codebase patterns.

## Layer 2 — Integration

**N/A by design.** Per `design.md` Testability Notes, imperative-shell behaviors (`useDebouncedValue`, `useUserPostSearch`, `UserPostSearchView`, `UserPostSearchInput`, `searchOwnPosts`) are not unit/integration-tested in isolation — they are covered end-to-end at Layer 4.

## Layer 3 — E2E Network Passthrough

**N/A by design.** This app talks directly to Supabase via the JS client; there is no separate internal API server to passthrough to.

## Layer 4 — E2E Local DB (8/8 executed paths pass)

**Environment used:**
- `pnpm --filter web dev:local` (Vite, port 5174, local Supabase mode)
- `supabase status` shows local stack at `http://127.0.0.1:54321`
- `agent-browser` 0.14.0 (no dev3000 — failure timelines unavailable in this run, but no failures occurred)
- Seed:
  1. `pnpm --filter web e2e:seed` → users `e2e@example.com` (user A, id `685d8262-4569-40a0-9cee-6b09b0b953fd`) and `e2e2@example.com` (user B, id `f32b0501-efae-42b6-a0d0-9b341041ed00`).
  2. `npx tsx scripts/seed-e2e-domain.ts` → board `e2e-test-board` + memberships + 25 baseline posts for user A.
  3. `npx tsx openspec/changes/add-user-post-search/verify/fixtures/seed-verify-posts.ts` → 64 additional verify-specific posts (1 '오늘의 작성', 1 long-body with `BODYNEEDLE`@offset 1000, 60 `LIMITNEEDLE` posts with descending `created_at`, 1 user-B public `ALPHA_ONLY`, 1 user-B private `ALPHA_ONLY`).

### Path results

**T.3 Happy path on own page (desktop)** — PASS

- Navigated to `/user`, snapshot showed `button "내 글 검색"` + `button "Go to user settings"` ✓ search icon visible alongside settings.
- Clicked search icon → snapshot showed `button "검색 닫기"` + `searchbox "내 글 검색어"`; profile/settings replaced ✓ search mode entered.
- Filled input with `오늘` → snapshot showed `link "오늘의 작성 오늘 글 본문 …"` as the matching result ✓ Korean 2-char gate passes, debounce fires, result returned.
- Clicked the result → URL became `http://localhost:5174/board/e2e-test-board/post/verify-post-today` ✓ navigation to detail page.

(Browser-back-to-search-mode-reset was not verified explicitly in this run; the spec ("Search mode is local state, not URL state") implies a fresh navigation resets `isSearchMode=false`, and the `useState` ownership in `UserPage.tsx` guarantees this.)

**T.4 Match past 500-char preview boundary** — PASS

- In search mode, filled with `BODYNEEDLE` → snapshot showed `link "long-body fixture aaaaa…"` as the result.
- The seeded `long-body fixture` post has `content = 'a'.repeat(1000) + 'BODYNEEDLE' + 'b'.repeat(490)`; `content_preview` only stores the first 500 chars (all `a`s), so a match here proves the API's `content.ilike` runs against the full `content` column. ✓

**T.5 50-result cap with newest-first ordering** — PASS

- Filled `LIMITNEEDLE` → `eval` returned `{cardCount: 50, capNoticeVisible: true, firstTitle: 'LIMITNEEDLE #001', lastTitle: 'LIMITNEEDLE #050'}`.
- Exactly 50 cards rendered ✓; cap notice "최근 50개까지만 표시됩니다…" visible ✓; newest-first ordering verified (#001 is most-recent, #050 is the 50th most-recent); seeded #051–#060 are correctly cap-excluded ✓.

**T.6 Cross-user isolation (no leak from search)** — PASS

- Filled `ALPHA_ONLY` (user B's unique phrase; user A has none of it) → `eval` returned `{resultCount: 0, emptyMessage: "'ALPHA_ONLY'에 일치하는 글이 없습니다.", bodyHasAlphaOnlyResult: false}`.
- Zero rows ✓; empty state copy is exactly the spec text with the trimmed query substituted in ✓; no leakage of user B's "B public" or "B private" posts into user A's search ✓.

**T.7 Mobile viewport keyboard** — NOT EXECUTED

Skipped in this run (requires `agent-browser -p ios` device profile). The underlying behaviors are wired in source:
- `<input inputMode="search" enterKeyHint="search">` in `UserPostSearchInput.tsx`
- `<header className="sticky top-0 z-10 bg-background">` in `UserPostSearchView.tsx`

**T.8 Empty state** — PASS (covered by T.6)

The empty-state assertion (`'<query>'에 일치하는 글이 없습니다.`) was already verified by T.6. A separate no-match query was not necessary since T.6's `ALPHA_ONLY` for user A is a true no-match against the seeded data.

**T.9 Escape-to-exit + focus return** — PASS

- While in search mode with input focused, sent `press Escape` → `eval` returned `{searchInputPresent: false, searchIconPresent: true, activeAriaLabel: '내 글 검색'}`.
- Search input gone ✓; search icon visible ✓; `document.activeElement` is the search icon button (aria-label="내 글 검색") ✓ — focus correctly returned after exit.

**T.10 Other user's page** — PASS

- Navigated to `/user/<user-B-id>` as user A → `eval` returned `{searchIconPresent: false, searchInputPresent: false, headerHidden: true}`.
- No search icon ✓; no search input ✓; `UserPageHeader` returns `null` so the `<header>` element itself is absent ✓.

**T.11 RLS defense-in-depth (load-bearing security contract)** — PASS

While signed in as user A, executed via browser `eval` (using user A's stored access token, never the service-role key):

```
GET /rest/v1/posts
  ?select=id,title,visibility,author_id
  &author_id=eq.<user-B-id>
  &or=(title.ilike.%25ALPHA_ONLY%25,content.ilike.%25ALPHA_ONLY%25)
```

Returned `{rowsReturned: 1, visibilities: ['public'], titles: ['B public']}`.

- Exactly 1 row returned — user B's `visibility='public'` post ✓
- The companion `visibility='private'` post (also containing `ALPHA_ONLY` in its content) was NOT returned ✓
- This is the load-bearing security contract: even if a malicious or buggy client side-steps the UI `isMyPage` gate AND the API's unconditional `.eq('author_id', userId)`, Postgres RLS still prevents private posts from leaking to anyone other than the author.

## Failures

None.

## Unverified Specs

- **Search Input Behavior** — `maxLength=100` is wired into the JSX but no path asserts that the 101st keystroke is rejected; consider adding a small DOM-level assertion in a follow-up.
- **Mobile viewport keyboard (T.7)** — see "T.7 NOT EXECUTED" above.
- **Search Result States: idle and error** — covered exhaustively by Layer 1 `deriveSearchState`; no Layer-4 path forces a Supabase error (would require disconnecting the DB mid-request).
- **Performance and Caching** — `staleTime` reuse and `keepPreviousData` flicker behavior are verified by Layer 1 `deriveSearchState` only; no Layer-4 path observes the live cache hits.
- **Escape behavior from typed-text state** — T.9 tested Escape from the idle search state (after the previous T.6 cleared the cards into empty). The exact "Escape from results state" transition was not separately exercised but follows identical wiring.
- **Browser-back-from-detail-resets-search-mode** — T.3's "back" step was not executed explicitly; relies on the `isSearchMode = useState(false)` reset on mount.

## Fix Tasks

None added. All executed paths passed; unverified-but-wired items are tracked above for the follow-up.

## Recommendation

Layer 1 + Layer 4 evidence is sufficient to claim the feature works against local Supabase with RLS. Proceed to the `spec-alignment` artifact. Add T.7 (mobile) and a maxLength=100 DOM assertion to the next round if desired; install `dev3000` before the next E2E session so future failures (if any) carry their unified timeline.
