## ADDED Requirements

### Requirement: Search Affordance on Own User Page

The user page SHALL display a search affordance (icon button) in the header on the signed-in user's own user page, and SHALL NOT display it on any other user's user page.

#### Scenario: Signed-in user opens their own user page

- **WHEN** a signed-in user navigates to `/user` or `/user/<their-own-id>`
- **THEN** the page header MUST render a search icon button with `aria-label="내 글 검색"` to the right of the page title, alongside the existing settings icon

#### Scenario: Signed-in user opens another user's page

- **WHEN** a signed-in user navigates to `/user/<another-user-id>` (where the id is not their own)
- **THEN** the page header MUST NOT render the search icon button or any other search affordance
- **AND** the existing header behavior (no header content on others' pages) MUST be unchanged

#### Scenario: Unauthenticated visitor

- **WHEN** an unauthenticated visitor reaches a user page (existing auth routing already restricts this)
- **THEN** the search affordance MUST NOT be reachable

### Requirement: Entering and Exiting Search Mode

Tapping the search icon SHALL toggle the user page into "search mode", in which the header content is replaced with a back/close button and a text input, and the regular profile + posts list is replaced with the search view.

#### Scenario: Enter search mode

- **WHEN** the signed-in user clicks the search icon button on their own user page
- **THEN** the page enters search mode
- **AND** the header content transforms in place to show a back/close button (`aria-label="검색 닫기"`) on the left and a text input (`aria-label="내 글 검색어"`) filling the remaining width
- **AND** the page title ("내 프로필") and settings icon are hidden while in search mode
- **AND** the header element acquires sticky positioning (`sticky top-0 z-10`)
- **AND** the text input receives focus automatically
- **AND** the `UserProfile` section and `UserPostsList` (infinite scroll) are unmounted and replaced with the `UserPostSearchView`

#### Scenario: Exit search mode via close button

- **WHEN** the user clicks the back/close button while in search mode
- **THEN** the page exits search mode
- **AND** the header returns to its non-search layout (title + settings icon + search icon)
- **AND** the regular `UserProfile` and `UserPostsList` are restored unchanged (infinite-scroll position preserved if React Query cache is warm)
- **AND** focus returns to the search icon button

#### Scenario: Exit search mode via Escape key

- **WHEN** the user presses the Escape key while the search input has focus
- **THEN** the page exits search mode with the same outcome as clicking the close button

#### Scenario: Search mode is local state, not URL state

- **WHEN** the user enters search mode, types a query, and then reloads the page
- **THEN** the page renders in its default (non-search) state with the regular post list
- **AND** the URL is unchanged from before search mode was entered

### Requirement: Search Input Behavior

The search input SHALL accept up to 100 characters, debounce queries by 300 ms, and gate execution on a minimum 2 code-unit query.

#### Scenario: Input accepts text and reflects it immediately

- **WHEN** the user types characters into the search input
- **THEN** each character appears in the input field immediately (no perceptible lag)
- **AND** the input enforces `maxLength=100`; the 101st character is rejected by the browser

#### Scenario: Debounced query fires 300 ms after the user stops typing

- **WHEN** the user types a sequence of characters with less than 300 ms between keystrokes
- **THEN** no search request is fired during that typing burst
- **AND** when the user pauses for at least 300 ms, exactly one search request fires using the latest typed value

#### Scenario: Whitespace is trimmed before search

- **WHEN** the debounced value contains leading or trailing whitespace
- **THEN** the value is trimmed before its length is compared to the minimum threshold
- **AND** the trimmed value is what is sent to the API

#### Scenario: Minimum query length of 2 code units

- **WHEN** the trimmed debounced value has fewer than 2 JS `String.length` code units (e.g. empty, one Latin char, one Hangul syllable)
- **THEN** no search request fires
- **AND** the view renders the idle state (see "Search Result States")

#### Scenario: Korean two-character search

- **WHEN** the trimmed value is "오늘" (two Hangul syllables = two code units)
- **THEN** the gate passes and the search request fires

### Requirement: Search Result States

The search view SHALL render exactly one of five states — idle, loading, results, empty, error — derived from the trimmed query length and the underlying React Query result.

#### Scenario: Idle state on entering search mode

- **WHEN** the user has just entered search mode and the input is empty
- **THEN** the view renders the idle state with the prompt "내가 쓴 글에서 제목 또는 내용으로 검색하세요" and helper text "제목과 본문에서 일치하는 글을 찾습니다."
- **AND** no skeleton, no cards, and no error UI is rendered

#### Scenario: Loading state during first query

- **WHEN** the trimmed query passes the minimum length gate and a search request is in flight, with no previous results in cache for the same `(userId, query)` key
- **THEN** the view renders 5 `PostItemSkeleton` placeholders

#### Scenario: Results state when matches are found

- **WHEN** the search request returns one or more matching posts
- **THEN** the view renders each post using the same `PostItem` component used by the regular post list, ordered by `created_at DESC`
- **AND** clicking any result navigates to that post's detail page

#### Scenario: 50-result cap notice

- **WHEN** the search returns exactly 50 results
- **THEN** the results list footer renders "최근 50개까지만 표시됩니다. 검색어를 더 구체적으로 입력해보세요."

#### Scenario: Empty state when no matches

- **WHEN** the search request completes successfully with zero matching posts
- **THEN** the view renders the message "'<query>'에 일치하는 글이 없습니다." with the trimmed query string substituted in

#### Scenario: Error state on Supabase failure

- **WHEN** the search request errors out
- **THEN** the view renders "검색 중 문제가 발생했습니다. 다시 시도해주세요."
- **AND** `Sentry.captureException(error)` is called with the error object only (the raw query string MUST NOT be attached as `extra` context)

#### Scenario: Idle takes precedence over stale cached results

- **WHEN** the view was previously in the results state and the user clears the input below the 2-code-unit threshold
- **THEN** the view immediately renders the idle prompt
- **AND** no previously matched post cards remain visible

### Requirement: Search Query Semantics

A search SHALL match the trimmed query as a case-insensitive substring against the user's own post `title` or full `content`, and SHALL return at most the 50 most recent matching posts.

#### Scenario: Title match

- **WHEN** a search is fired with a keyword that appears in a user's post title
- **THEN** that post appears in the results

#### Scenario: Content match past the 500-char preview boundary

- **WHEN** a search is fired with a keyword that appears in the post body at a character offset greater than 500
- **THEN** the post still appears in the results
- **BECAUSE** the query matches against the full `content` column server-side, not against `content_preview`

#### Scenario: Case-insensitive substring match

- **WHEN** the keyword differs in letter case from the stored title or content
- **THEN** the post still matches

#### Scenario: Results ordered by recency

- **WHEN** more than one post matches
- **THEN** results are ordered by `created_at DESC`

#### Scenario: 50-result cap selects newest first

- **WHEN** more than 50 posts match the query
- **THEN** the API returns exactly the 50 newest matching posts and omits older matches

### Requirement: Search Scope Is Always the Profile Owner's Own Posts

The search SHALL only return posts whose `author_id` equals the user-page owner's id, enforced by three independent layers: UI guard, API filter, and Postgres RLS.

#### Scenario: Search is gated on `isMyPage`

- **WHEN** the page is rendered for any user other than the signed-in user
- **THEN** the search affordance is not rendered at all

#### Scenario: API always filters by `author_id`

- **WHEN** the search API function is invoked
- **THEN** the underlying Supabase query unconditionally includes `.eq('author_id', userId)` regardless of caller arguments

#### Scenario: RLS defense in depth

- **WHEN** a malicious or buggy client invokes the search function with a different user's id
- **THEN** Postgres row-level security on `posts` MUST return either zero rows or only that user's `visibility = 'public'` posts — never that user's private posts
- **AND** this property is verified in an automated end-to-end test using a real user-auth session (not the service-role key)

### Requirement: Input Value Is Escaped Before Reaching PostgREST

User-supplied keyword input SHALL be sanitized by the shared `escapeForOrFilter` utility before being interpolated into any PostgREST `.or()` filter string.

#### Scenario: Wildcards are escaped

- **WHEN** the keyword contains `%`, `_`, or `\`
- **THEN** the helper escapes each with a leading `\` so the literal character is matched by `ILIKE`, not used as a wildcard

#### Scenario: PostgREST grammar characters are percent-encoded

- **WHEN** the keyword contains `,` `(` `)` `*` `"` `:` `.` or whitespace/newline/tab
- **THEN** the helper percent-encodes each in the value-segment portion so the surrounding `.or()` clause cannot be reinterpreted by the PostgREST parser

#### Scenario: Injection attempt cannot expand the filter

- **WHEN** the keyword is `,author_id.eq.<some-other-uuid>`
- **THEN** the resulting `or=` URL parameter MUST NOT cause Postgres to evaluate a second `author_id.eq.<…>` filter clause
- **AND** the unconditional `.eq('author_id', userId)` plus RLS prevent any cross-user data from being returned in the result set

### Requirement: Performance and Caching

The search hook SHALL use React Query with a 30-second stale time, keep previous data while a new query is in flight, and never enter an "infinite scroll" mode in v1.

#### Scenario: React Query caches successive identical queries

- **WHEN** the same `(userId, query)` pair is searched twice within the 30-second stale window
- **THEN** the second invocation reuses the cached result without a network request

#### Scenario: Previous results stay visible while a new query is in flight

- **WHEN** the user has results displayed for query A and types to produce a new debounced query B
- **THEN** results from query A remain visible until query B's response arrives
- **AND** during that interval the view is still considered to be in the `'results'` state (no skeleton)

#### Scenario: No pagination beyond 50

- **WHEN** the user views a result set that has hit the 50-row cap
- **THEN** no "load more" affordance is rendered
- **AND** the cap notice is shown so the user can refine the query

### Requirement: Accessibility

The search affordance and input SHALL meet a baseline of keyboard and screen-reader accessibility.

#### Scenario: Keyboard activation of the search icon

- **WHEN** the search icon button has focus and the user presses Enter or Space
- **THEN** search mode is entered, same as a mouse click

#### Scenario: ARIA labels are present

- **WHEN** an assistive technology inspects the search controls
- **THEN** the search icon button announces `aria-label="내 글 검색"` with `aria-pressed` reflecting whether search mode is active
- **AND** the input announces `aria-label="내 글 검색어"`
- **AND** the close button announces `aria-label="검색 닫기"`

#### Scenario: Mobile keyboard hints

- **WHEN** the input is focused on a mobile device
- **THEN** the input declares `inputMode="search"` and `enterKeyHint="search"` so the on-screen keyboard renders a search action button

#### Scenario: Focus management on exit

- **WHEN** search mode is exited (via close button or Escape)
- **THEN** keyboard focus is moved back to the search icon button so the user can re-enter search mode without losing their place
