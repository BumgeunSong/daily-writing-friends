# Handoff: scroll restoration and view transition coordination

**Branch**: `indigo-cornucopia` (PR #655)
**As of**: 2026-06-14, after commit `a2fa787e`.
**Target device**: iPhone running iOS Safari 26.5 against `http://192.168.0.27:5173` via Vite HMR.

## What the work is

The branch ships motion polish: directional view transitions for hierarchical navigation, image fade-in on PostDetail, stagger reveal on infinite scroll, and bottom-tab indicator polish. Recent commits attempt to coordinate scroll save/restore with the View Transitions API and to suppress duplicate slides during iOS edge-swipe back.

## Verified working (iPhone)

1. Forward view transition (BoardPage → PostDetail; NotificationItem → PostDetail).
2. In-app `PostBackButton` runs the back-slide animation.
3. Tap Home tab on `/board/:boardId` runs the registered handler (smooth scroll-to-top + refetch).
4. Tap Home tab on `/board/:boardId/post/:postId` navigates to `/boards` with back-slide.
5. iOS edge-swipe back from `/board/X/post/Y` arriving at `/notifications`: no duplicate slide.

## Reported broken (iPhone, must reproduce — do not assume cause)

1. **Scroll position on BoardPage is not restored after POP**. Both the in-app back button and iOS edge-swipe leave the page at scrollY = 0. The `useRouteScrollRestoration` hook was added to BoardPage; user still sees no restoration.
2. **Brief flicker at end of iOS swipe**: PostDetailPage is visible for a short moment after the swipe completes before BoardPage replaces it.
3. **Unexpected scroll behavior when entering PostDetail**. User wrote "scroll restoration which is not expected" — specifics not described. Ask before guessing.
4. **No scroll restoration after tab-tap from PostDetail to `/boards`**. This is a PUSH navigation (`navigate('/boards', { viewTransition: true })`), so the hook intentionally skips it. User expected restoration here; current behavior is per the hook contract, not a bug in the strict sense.

## Recent commits on the branch (most recent last)

```
b24bed8b feat(comment): 댓글 목록 항목별 스태거 등장
... (earlier motion work)
fd288357 feat(motion): 탭 선택 리프트·본문 이미지 페이드·무한 스크롤 스태거
74293e99 feat(nav): 깊은 화면에서 탭바 탭 시 백 슬라이드
a03a005a refactor(nav): 백 슬라이드는 진짜 자손 페이지일 때만
84b4fd3a fix(motion): iOS 스와이프 백과 뷰 트랜지션 중첩 해소
6f9d3a31 fix(nav): 라우트 전환 시 하단탭 숨김·스크롤 복원 점프 해소
787a77e4 refactor(nav): 라우트 전환 부작용을 단일 모듈로 모음 (effect 줄이기)
18a9f8eb fix(nav): BoardPage 스크롤 복원·BoardPage에서 Home 탭 탭 동작 복구
a2fa787e fix(nav): RR ScrollRestoration 제거·브라우저 pop에서 잔여 방향 속성 제거
```

## Files in play

| Path | Role |
|---|---|
| `apps/web/src/shared/navigation/navigationLifecycle.ts` | Owns the `data-transition` attribute lifecycle (HOLD_MS = 600), the scroll-direction suppression window, and the popstate listener that clears the attribute on browser-initiated pop. |
| `apps/web/src/shared/navigation/useViewTransitionNavigate.ts` | Thin hook exposing `forward(to)` and `back()`. Calls the lifecycle markers, then `navigate(to, { viewTransition: true })` or `navigate(-1)`. |
| `apps/web/src/shared/navigation/useRouteScrollRestoration.ts` | The hook intended to restore scroll. Uses `useNavigationType()`; saves on unmount via `useEffect` cleanup; restores via `useLayoutEffect` only when navType === 'POP'. |
| `apps/web/src/shared/navigation/tabHierarchy.ts` | Per-tab URL prefix table for "is this path in this tab's stack." |
| `apps/web/src/shared/components/BottomTabsNavigator.tsx` | Tab bar. `handleTabClick` branches: same-tab → registered handler; same-stack deep page with a registered handler → registered handler; same-stack deep page with no handler → markBack + navigate to root with view transition; else lateral → handleTabAction. |
| `apps/web/src/shared/contexts/BottomTabHandlerContext.tsx` | Per-tab handler registry. Exposes `hasRegisteredHandler`. |
| `apps/web/src/shared/contexts/NavigationContext.tsx` | Owns `isNavVisible`. Forces nav visible on every location change. |
| `apps/web/src/shared/hooks/useScrollDirection.ts` | Window scroll throttler. Consults `isScrollDirectionSuppressed()` and silently advances baseline when suppressed. |
| `apps/web/src/board/components/BoardPage.tsx` | Route `/board/:boardId`. Calls `useRouteScrollRestoration('board-' + boardId)`. |
| `apps/web/src/board/components/RecentPostCardList.tsx` | List inside BoardPage. Registers Home tab handler (`handleRefreshPosts`). No longer owns scroll restoration. |
| `apps/web/src/post/components/PostDetailPage.tsx` | Route `/board/:boardId/post/:postId`. Does NOT use `useRouteScrollRestoration`. The prior `scrollTo(0)` useEffect was removed. |
| `apps/web/src/router.tsx` | Data router. **`<ScrollRestoration />` removed** to prevent it from overriding child useLayoutEffects. |
| `apps/web/src/index.css` | View-transition CSS. `::view-transition-old/new(root) { animation: none }` is the default; the `[data-transition='forward' \| 'back']` rules override. |

## How navigation currently flows

**Forward push (e.g., BoardPage → PostDetail via PostCard tap)**
1. `viewTransitionNavigate.forward(to)` calls `markForwardNavigation()`.
2. `markForwardNavigation` sets `documentElement.dataset.transition = 'forward'`, schedules clear at 600 ms, extends scroll-suppression to 600 ms.
3. `navigate(to, { viewTransition: true })` is invoked.
4. RR enters its loading state, runs loaders, then calls `document.startViewTransition` with the commit callback.
5. Old DOM snapshot captures `[data-transition='forward']` and CSS animates the slide.

**In-app back (PostBackButton)**
1. `viewTransitionNavigate.back()` calls `markBackNavigation()`.
2. `markBackNavigation` sets `isOurNextPopIntentional = true`, sets `data-transition = 'back'`, extends suppression.
3. `navigate(-1)`.
4. popstate fires. Listener sees `isOurNextPopIntentional`, resets it, returns — leaving `data-transition='back'` intact for the view-transition CSS.

**iOS edge-swipe back**
1. iOS animates the swipe out of band.
2. popstate fires. Listener sees `isOurNextPopIntentional === false`, extends suppression AND deletes `data-transition`.
3. RR commits the POP via its own `viewTransition: true` (because the original forward push opted in).
4. View transition runs without a direction → CSS resolves to `animation: none` → no second slide.

## Open hypotheses for the broken cases (UNVERIFIED — confirm before fixing)

| # | Hypothesis | How to verify |
|---|---|---|
| H1 | `useEffect` cleanup in `useRouteScrollRestoration` does not run during view-transition-wrapped commits, so no value is saved on the forward push. | Add `console.log` in cleanup. Reproduce flow. Inspect Safari console via macOS Develop menu → iPhone. |
| H2 | `useNavigationType()` returns `'PUSH'` or `'REPLACE'` (not `'POP'`) on iOS swipe back when the original push used `viewTransition: true`. | Log `useNavigationType()` inside the hook. |
| H3 | `sessionStorage.setItem` is silently rejected (Private Browsing or similar restriction). | Manually read the key in Safari console: `sessionStorage.getItem('route-scroll:board-X')`. |
| H4 | `window.scrollTo(800)` clamps to a smaller value because `document.body.scrollHeight` is short when `useLayoutEffect` runs (TanStack Query has not painted posts yet). | Log `document.body.scrollHeight` before scrollTo. |
| H5 | A later layout effect or RR-internal scroll handler resets to 0 after our restore. | Spy on `window.scrollY` via `setInterval` for ~500 ms after the POP. |
| H6 | Browser native `scrollRestoration = 'auto'` interferes with the view-transition'd POP. | Set `window.history.scrollRestoration = 'manual'` in `navigationLifecycle.ts` module init and retest. |

## How to reproduce on the dev rig

1. Mac running Vite dev server on LAN: `pnpm --filter web exec vite --host 0.0.0.0 --port 5173` from the worktree.
2. iPhone on same Wi-Fi visits `http://192.168.0.27:5173`. Reduce Motion in iOS Settings must be **off**.
3. Log in via the email/password form (not Google OAuth — Google redirects to production because the LAN URL is not in the Supabase allow list).
4. Test cases listed in "Verified working" and "Reported broken."

## What NOT to do next

- Do not propose more "obviously correct" fixes before adding diagnostics and confirming what is actually happening at runtime.
- Do not assume `useNavigationType()`, `useEffect` cleanup, or `sessionStorage` behave the same under view transitions as without.
- Do not introduce new modules to "isolate" the problem; the navigation surface already has one too many layers (`navigationLifecycle.ts` was a recent consolidation — keep collapsing, not splitting).

## Questions to ask the user before making changes

1. When entering PostDetail, what specifically do you see — the page jumping to a non-zero scroll, or some other visible artifact?
2. When restoration fails on BoardPage, is the final scrollY exactly 0, or some unexpected positive value?
3. Are you testing in the Safari tab, or as an installed PWA?
4. Does Reduce Motion remain off in iOS Settings → Accessibility → Motion?

## Suggested first move in the next session

Add temporary `console.log` statements to `useRouteScrollRestoration` covering the three phases (cleanup save, layout-effect read, scrollTo call), then have the user reproduce one failing flow with Safari → Develop → iPhone open. Make no other change. Read the log. Decide next step from data, not from theory.
