# QA Scenario — `llm-web-vitals` branch regression check

**Branch under test:** `llm-web-vitals` (33 source files changed)
**Goal:** Verify that **functional behavior is preserved** by every perf change before merge.
**Environment:** local dev server (`http://localhost:5173`) + local Supabase (`:54321`) + frozen perf fixture user (`e2e@example.com`).

---

## Risk map (what changed → what to verify)

| Area | Change | Risk |
|---|---|---|
| `useIsCurrentUserActive`, `useUpcomingBoard` | dropped `isConfigLoading` gate (iter#12) | Wrong board redirect on `/` if remote-config differs from defaults |
| `BoardPageHeader` | renders header immediately, drops `<StatusMessage isLoading>` page replacement (iter#26) | Title text shows before board loads (placeholder) |
| `BestPostCardList` | lazy chunk (iter#48) | Suspense fallback null — "best" filter must still render |
| `useRecentPosts` | `blockedByUsers ?? []` (drops gate, iter#53) | Feed shows posts even when blocklist query hasn't returned |
| `FEED_POST_SELECT` | drops `comments(count)/replies(count)` aggregates + `boards(first_day)` join (iter#31, #37) | Counts and `weekDaysFromFirstDay` must fall back to denormalized columns |
| `PostDetailPage` | loader cache seeding + `Comments` lazy (iter#26, #48) | Page must paint instantly; comments must mount after suspense |
| `PostMetaHelmet` | react-helmet-async REMOVED → imperative `document.title` + meta tags (iter#8) | `<title>`, og:, twitter: meta must be set correctly |
| `NotificationsPage` | layout-immediate, drops profile-image lookup (iter#26, #54) | List renders, avatars fall back to initials |
| `Toaster` | lazy-loaded via React.lazy (iter#40) | Any toast trigger must still work (e.g. login error) |
| `useNavigationTracking` | no-op (iter#40) | Navigation still works; just no Sentry breadcrumbs |
| `sentry.ts` | tracesSampleRate 0 default (iter#31) | Sentry must not throw; tracing disabled is fine |
| `LoginPage` | lazy chunk (iter#2) | Logout → login flow must still work |
| `vite.config.ts` | drop console/debugger + disable modulepreload polyfill (iter#10) | Production build only — no impact in dev mode |

---

## Test cases

### TC-01 — Root redirect (`/`)
1. Open `/` as authenticated member
2. **Expected:** redirected to `/board/1a65026a-cf93-4828-be54-fd8d034008da` (active board)
3. **Pass criteria:** URL changes to `/board/:id`, no console errors

### TC-02 — Board feed loads
1. Navigate to `/board/1a65026a-cf93-4828-be54-fd8d034008da`
2. **Expected:**
   - Header shows board title within 3s
   - PostCard list renders with ≥ 1 post
   - Each card shows: author, title, content preview, optional thumbnail
3. **Pass criteria:** ≥ 1 PostCard visible; no JS errors

### TC-03 — Best filter
1. On boardFeed, click "Best" filter
2. **Expected:** Suspense fallback briefly null → `BestPostCardList` mounts
3. **Pass criteria:** Best list renders or shows empty state; no JS errors

### TC-04 — Post detail (loader cache seed)
1. Click first PostCard
2. **Expected:**
   - Page navigates to `/board/:id/post/:id`
   - Post title + content visible immediately (cache-seeded)
   - Comments section mounts within 2s (lazy via Suspense)
3. **Pass criteria:** Title + content visible without skeleton flash; Comments mount; no JS errors

### TC-05 — PostMetaHelmet imperative tags
1. On post detail page, inspect `document.title`
2. Inspect meta tags: `og:title`, `og:description`, `og:image`, `twitter:title`
3. **Expected:** Title matches post title; og: tags reflect post content
4. **Pass criteria:** `<title>` and og:/twitter: meta tags correctly set

### TC-06 — Notifications page
1. Navigate to `/notifications`
2. **Expected:**
   - Layout shell renders immediately
   - Notification list renders (or empty state if no notifications)
   - Avatars: if `fromUserProfileImage` undefined, fall back to initials (no broken image)
3. **Pass criteria:** Page paints without skeleton-only state; no JS errors

### TC-07 — Back/forward navigation
1. From post detail → click back → return to feed
2. **Expected:** Scroll restoration, feed re-renders without refetch (TanStack Query cache)
3. **Pass criteria:** Feed visible; no JS errors

### TC-08 — Console error baseline
1. Throughout TC-01..07, monitor `console.error` and `console.warn`
2. **Allowed noise** (pre-existing, not caused by this branch):
   - `firebasestorage.googleapis.com/.../*_600x338.jpg 404` — see issue #621
3. **Pass criteria:** No new JS errors not already on main

### TC-09 — Logout/login (Toaster + LoginPage lazy)
1. Logout from app
2. Navigate to `/login`
3. **Expected:**
   - LoginPage chunk fetches and renders (lazy)
   - Trigger a toast (e.g. failed login attempt) → Toaster lazy chunk loads and shows toast
4. **Pass criteria:** Login form renders; toast appears on error

---

## Out of scope

- Visual regression (pixel comparison)
- Performance (perf-harness already covered)
- Production build differences (`drop:[console,debugger]` only affects prod bundle)
- Tiptap image upload pipeline (not changed by perf loop; covered by existing unit tests)

---

## Execution

Run via `tests/qa/run-llm-web-vitals-verify.mjs` (Playwright + Chromium against `http://localhost:5173`).
