# Integration Testing Stack — PR-2 and PR-3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Land 5 reference integration-test patterns that PR-1's MSW + provider infra was built for, plus the `integration-testing` skill that codifies "how to write a new integration test in this codebase."

**Architecture:** Three-tier test pyramid. **Unit tier** (existing `testing` skill — pure functions). **Integration tier** (new — single component or hook + React Query cache + MSW-mocked Supabase, <300ms each). **E2E tier** (Playwright — real Supabase, 5–15 tests total). Each tier has a decision rubric; new tests must land in the right tier.

**Tech Stack:** Vitest, MSW v2, React Testing Library v16, user-event v14, React Query v4, React Router v6 (data router), TypeScript strict, jsdom.

---

## Context

### Why this stack exists

User wants integration test coverage because pure-function unit tests miss bugs in the seam between component, React Query cache, and the Supabase network layer. Examples of bugs that have shipped past both unit and E2E tiers:

- Wrong `queryKey` shape causing stale-after-mutation reads
- Missing `await` on loader chains
- `useInfiniteQuery` sentinel double-fire causing duplicate fetches
- Error response vs empty-list rendering precedence
- BOARD_ID clear ordering in 403 handler

Per the Testing Trophy (Kent C. Dodds, validated by the workflow's research), the integration tier catches these for ~10× less cost than E2E.

### What PR-1 shipped (already merged or open as #656)

12 commits on `feat/integration-testing-1-infra`:

- MSW v2 installed; `apps/web/src/test/msw/{server.ts, handlers/{index.ts, auth.ts}}`
- `onUnhandledRequest: 'error'` in `setupTest.ts` — handler gaps fail loudly
- `apps/web/src/test/utils/withProviders.tsx` — router-agnostic `{Wrapper, queryClient}`, alongside legacy `renderWithProviders.tsx`
- `apps/web/src/test/utils/deferred.ts` + tests — controllable promise for callback-driven components
- `aria-label='댓글 등록'` on `CommentInput` icon button (real a11y win)
- `data-testid='post-card-skeleton'` on `PostCardSkeleton`

Auth handler currently has: stateful `signedInUserId`, `resetAuthHandlerState()`, three endpoints (`GET /auth/v1/user`, `POST /auth/v1/token`, `POST /auth/v1/logout`). All handler writes go directly to the module variable — PR-2 will consolidate this through a single `setSession` path.

### Open decisions to resolve in PR-2

Three blockers must be answered before reference tests are written. Each has a recommended default; ask the user only if you disagree.

**D-1: Korean copy coupling strategy.** Verifiers found 3 of 4 original sketches had wrong copy. Two options:

- **(a) Extract Korean strings to `messages.ts` co-located with each component.** Test imports the same const, so renames stay in sync. Highest refactor-resistance.
- **(b) Prefer `data-testid` for structure + `getByText` for affirmative content only.** Less invasive but tests still couple to copy in one place.

**Recommendation: (a)** for new tests landing in PR-2/PR-3. Existing components can stay (b) until they're touched.

**D-2: Pattern 4 (form) scope.** `CommentInput`, `LoginPage`, `usePostSubmit`, `useUpdateUserData` are all "form" but different shapes. Two options:

- **(a) Write only the CommentInput pattern in PR-2, document the shape differences in the skill.** Other forms become "extend pattern X" follow-ups when needed.
- **(b) Write 4 distinct sub-patterns now.** Higher upfront cost, higher coverage.

**Recommendation: (a)** — YAGNI. Add new sub-patterns when a real test demands them.

**D-3: MSW lifecycle scope (from PR-1 review S-3).** `setupTest.ts` currently runs MSW for ALL test files, including pure-function unit tests. With `'error'` mode now active, any future unit test that accidentally imports a module triggering `fetch` will fail with an MSW error unrelated to its assertion. Two options:

- **(a) Split into `setupTest.unit.ts` + `setupTest.integration.ts` via Vitest `projects` config.** Filename convention `*.integration.test.tsx` selects the integration setup.
- **(b) Keep one setup file; rely on `'error'` mode to flush out any latent fetch leaks immediately.**

**Recommendation: (a)** — the verifier's concern is real and compounds as more handlers ship. Task PR-2-1 below.

**D-4 (defer to PR-3): `HttpResponse.error()` vs status 503.** Pattern 5 needs the loader to throw a `SupabaseNetworkError`. Whether MSW's `HttpResponse.error()` triggers this through the supabase-js wrapper is unverified. Investigate during PR-3 implementation; if it doesn't, return status 503 directly and adjust `mapPostLoaderError` classification.

### Multi-agent review items deferred from PR-1 to PR-2

From the 5-agent review of PR-1 (see commit history and PR #656 conversation):

- **S-2** — Consolidate auth handler to single `setSession(next)` write path with named `AuthSession` type. Closes the two-write-path smell. (Task PR-2-2.)
- **S-3** — MSW tier separation (see D-3 above). (Task PR-2-1.)
- **S-4** — Extract `TEST_NAVIGATION_PROPS` const shared by `withProviders` + legacy `renderWithProviders`. (Task PR-2-3.)
- **S-5** — Handler-reset registry in `handlers/index.ts` — exports `handlerResets: Array<() => void>`. Prevents "forgot to register" leaks. (Task PR-2-4.)
- **S-6** — Assert `VITE_SUPABASE_URL` is set in `setupTest.ts`. (Task PR-2-5.)
- **S-7** — Delete duplicate `Deferred` / `createDeferred` in `apps/web/src/draft/utils/squashableInvoker.test.ts:5-19`, import from `@/test/utils/deferred`. (Task PR-2-6.)

### Guard-rail tests recommended by `pr-test-analyzer`

These prove the infra actually works as designed. Land alongside the first reference test in PR-2. Each rated 6-9 in importance.

- **G-1** (rating 9) `resetAuthHandlerState` isolates between tests (test A signs in, test B in same file asserts null user)
- **G-2** (rating 8) `setSession` → `GET /auth/v1/user` end-to-end via a tiny harness component
- **G-3** (rating 8) `deferred` used to gate a real React Query loading-state assertion deterministically
- **G-4** (rating 7) `retry: false` in `createTestQueryClient` actually prevents retries (one 500 surfaces as error on first attempt)
- **G-5** (rating 6) `onUnhandledRequest: 'error'` actually throws when expected

---

## PR-2 — Skill + first 2 reference tests + infra hardening

**Branch:** `feat/integration-testing-2-skill-and-first-tests` off merged `main` (after PR-1 lands).

**Patterns shipped:** Pattern 1 (infinite-query-list — `RecentPostCardList`) and Pattern 4 (form-with-callback — `CommentInput`).

**Out of scope:** Patterns 2, 3, 5 (PR-3). `routeConfig.ts` extraction (PR-3).

### Task PR-2-1: Split MSW lifecycle via Vitest projects (D-3, S-3)

**Files:**
- Modify: `apps/web/vite.config.ts:127-141` — replace single `test` block with `test.projects` array
- Create: `apps/web/src/setupTest.integration.ts`
- Modify: `apps/web/src/setupTest.ts` — remove MSW lifecycle, keep DOM polyfills + Sentry mock
- Modify: `apps/web/src/test/msw/server.ts:1` — no change needed; still imported by integration setup only

**Step 1: Write a failing assertion test**

Create `apps/web/src/test/tier-separation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('test tier separation', () => {
  it('current file matched the unit project (no MSW server in scope)', async () => {
    const mod = await import('msw/node').then(() => null).catch(() => null);
    expect(true).toBe(true);
  });
});
```

This test passes either way; its real purpose is to live in the *unit* project and prove the projects config compiles. Real proof comes from G-5 (Task PR-2-9).

**Step 2: Configure projects**

In `apps/web/vite.config.ts`, replace the `test` block:

```typescript
test: {
  projects: [
    {
      extends: true,
      test: {
        name: 'unit',
        include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
        exclude: ['src/**/*.integration.test.{ts,tsx}'],
        setupFiles: ['./src/setupTest.ts'],
        environment: 'jsdom',
      },
    },
    {
      extends: true,
      test: {
        name: 'integration',
        include: ['src/**/*.integration.test.{ts,tsx}'],
        setupFiles: ['./src/setupTest.ts', './src/setupTest.integration.ts'],
        environment: 'jsdom',
      },
    },
  ],
  coverage: { /* unchanged */ },
}
```

**Step 3: Create integration-only setup**

`apps/web/src/setupTest.integration.ts`:

```typescript
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './test/msw/server';
import { handlerResets } from './test/msw/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  handlerResets.forEach((reset) => reset());
});
afterAll(() => server.close());
```

**Step 4: Strip MSW from unit setup**

In `apps/web/src/setupTest.ts`, remove lines that import server / call `server.listen` / `afterEach`-reset MSW state. Keep Sentry mock, custom matchers, `ResizeObserver`/`IntersectionObserver`/`matchMedia` polyfills.

**Step 5: Run both projects**

```bash
pnpm --filter web test:run
```

Expected: 1093 tests still pass. Unit project skips integration files (none exist yet); integration project has zero files matching. Both projects boot cleanly.

**Step 6: Commit**

```
test(infra): MSW를 integration 프로젝트로 분리

- 'error' 모드에서 unit 테스트가 우발적 fetch에 실패하면 무관한 assertion이 깨짐
- Vitest projects로 setupTest 분리 — *.integration.test.tsx만 MSW 라이프사이클 적용
```

---

### Task PR-2-2: Add AuthSession type + single setSession write path on top of PR-1's refactor (S-2)

**Status:** Partially done in PR-1 (#656 commit `92acab07`). PR-1 already extracted: URL constants, response builders (`unauthorized`, `invalidGrant`, `passwordGrantSession`, `userResponse`), and the pure `userIdFromEmail` helper with its test at `apps/web/src/test/msw/handlers/auth.test.ts`. Remaining work in PR-2: introduce `AuthSession` type, add `testEmailFor` companion, harden `userIdFromEmail` to throw on empty local part, route all 3 writes (`POST /token`, `POST /logout`, `resetAuthHandlerState`) through a single private `setSession(next)`.

**Files:**
- Modify: `apps/web/src/test/msw/handlers/auth.ts`
- Modify: `apps/web/src/test/msw/handlers/auth.test.ts` — extend with the round-trip test + empty-local-part throw test

**Step 1: Extend the failing test**

Add to `auth.test.ts`:

```typescript
import { testEmailFor, userIdFromEmail } from './auth';

it('testEmailFor and userIdFromEmail round-trip', () => {
  expect(userIdFromEmail(testEmailFor('alice'))).toBe('alice');
});

it('userIdFromEmail rejects empty local-part', () => {
  expect(() => userIdFromEmail('@test.local')).toThrow();
});
```

Run: expected FAIL — `testEmailFor` not exported; existing `userIdFromEmail` doesn't throw on empty local part.

**Step 2: Modify handler**

In `auth.ts`:

- Add `interface AuthSession { readonly userId: string; readonly email: string; }`
- Add `export function testEmailFor(userId: string): string { return \`${userId}@test.local\`; }`
- Harden `userIdFromEmail` to throw when `localPart` is empty
- Replace `let signedInUserId: string \| null` with `let session: AuthSession \| null`
- Add private `function setSession(next: AuthSession \| null): void { session = next; }`
- Route `resetAuthHandlerState`, the token handler success path, and the logout handler all through `setSession(...)`
- Update `userResponse` to take an `AuthSession` (`{ userId, email }`) instead of just `userId` — derived email no longer needed since the session carries it

**Step 3: Verify**

Full suite green.

**Step 4: Commit**

```
refactor(test): auth handler에 AuthSession 타입과 단일 setSession 경로 도입

- PR-1의 헬퍼 추출 위에 의미적 강화 — id+email이 함께 다니도록 AuthSession 타입으로 묶음
- 3개의 직접 mutation 지점을 setSession 단일 경로로 통합 — cross-cutting 로직(로그/토큰 store 등) 확장 시 한 곳만 수정
```

---

### Task PR-2-3: Extract TEST_NAVIGATION_PROPS const (S-4)

**Files:**
- Create: `apps/web/src/test/utils/testNavigationProps.ts`
- Modify: `apps/web/src/test/utils/withProviders.tsx:40`
- Modify: `apps/web/src/test/utils/renderWithProviders.tsx:26-28`

**Step 1: Create const**

`apps/web/src/test/utils/testNavigationProps.ts`:

```typescript
export const TEST_NAVIGATION_PROPS = {
  debounceTime: 500,
  topThreshold: 30,
  ignoreSmallChanges: 10,
} as const;
```

**Step 2: Replace in both helpers**

In `withProviders.tsx` line 40, replace `<NavigationProvider debounceTime={500} topThreshold={30} ignoreSmallChanges={10}>` with `<NavigationProvider {...TEST_NAVIGATION_PROPS}>`. Same in `renderWithProviders.tsx:26-28`. Add the import in both files.

**Step 3: Run**

`pnpm --filter web test:run` — all green.

**Step 4: Commit**

```
refactor(test): NavigationProvider 매직 넘버를 TEST_NAVIGATION_PROPS로 추출

- withProviders와 renderWithProviders 두 곳 중복 — 한쪽만 바꾸면 silent drift
```

---

### Task PR-2-4: Handler-reset registry (S-5)

**Files:**
- Modify: `apps/web/src/test/msw/handlers/index.ts`
- Modify: `apps/web/src/setupTest.integration.ts` (created in Task PR-2-1)

**Step 1: Export registry**

`apps/web/src/test/msw/handlers/index.ts`:

```typescript
import { authHandlers, resetAuthHandlerState } from './auth';

export const handlers = [...authHandlers];
export const handlerResets: Array<() => void> = [resetAuthHandlerState];
```

**Step 2: Consume in setup**

In `apps/web/src/setupTest.integration.ts`, replace the explicit `resetAuthHandlerState()` call with `handlerResets.forEach((reset) => reset());`. (Already in the template from Task PR-2-1; this task verifies it works after the export lands.)

**Step 3: Run**

`pnpm --filter web test:run` — all green.

**Step 4: Commit**

```
refactor(test): handler-reset 레지스트리 패턴 도입

- 새 handler 모듈 추가 시 reset 함수 등록을 잊으면 cross-test 누수 — 레지스트리로 누락 방지
```

---

### Task PR-2-5: Assert VITE_SUPABASE_URL in setup (S-6)

**Files:**
- Modify: `apps/web/src/setupTest.integration.ts`

**Step 1: Add assertion**

At the top of `setupTest.integration.ts`:

```typescript
import { beforeAll as _vitestBeforeAll } from 'vitest';

if (!import.meta.env.VITE_SUPABASE_URL) {
  throw new Error(
    'VITE_SUPABASE_URL is required for integration tests. ' +
    'Set it to http://localhost:54321 in the test env.',
  );
}
```

(Use module-top throw, not `beforeAll` — fails at config-load time, gives the clearest error.)

**Step 2: Test by temporarily unsetting**

Manually: `VITE_SUPABASE_URL='' pnpm --filter web test:run` should fail with the message. Restore env after verifying.

**Step 3: Commit**

```
test(infra): integration 셋업에서 VITE_SUPABASE_URL 강제

- 누락 시 AuthProvider가 createClient에서 throw — 무관한 mount 실패로 디버깅 곤란
- 셋업 단계에서 명시적으로 실패 → 즉시 원인 파악
```

---

### Task PR-2-6: Delete duplicate Deferred/createDeferred (S-7)

**Files:**
- Modify: `apps/web/src/draft/utils/squashableInvoker.test.ts:5-19`

**Step 1: Replace local definition with import**

Delete the local `Deferred` interface and `createDeferred` function. At top of file: `import { deferred } from '@/test/utils/deferred';`. Replace `createDeferred<T>()` call sites with `deferred<T>()`.

**Step 2: Run**

`pnpm --filter web test:run apps/web/src/draft/utils/squashableInvoker.test.ts` — all green.

**Step 3: Commit**

```
refactor(draft): squashableInvoker 테스트의 중복 Deferred를 공용 헬퍼로 교체

- 같은 패턴이 두 곳에 존재 — 시그니처가 갈라지면 일관성 깨짐
```

---

### Task PR-2-7: Create the `integration-testing` skill

**Files:**
- Create: `.claude/skills/integration-testing/SKILL.md`

**Step 1: Write the skill body**

`.claude/skills/integration-testing/SKILL.md`:

```markdown
---
name: integration-testing
description: Use when writing tests for React components or custom hooks that touch the React Query cache, MSW-mocked Supabase, or React Router data-router loaders. Triggers - writing component tests, writing hook tests that need a provider tree, creating MSW handlers, render() + screen assertions, data-fetching component tests, form integration tests, loader/errorElement tests, optimistic-mutation tests. Does NOT cover pure-function unit tests (use the testing skill) or cross-page journeys (use Playwright E2E).
---

# When to use

- Testing a component subtree, custom hook, or router-loader contract
- Behavior under test crosses at least one seam: hook↔cache, cache↔render, loader↔errorElement, form↔callback, sentinel↔fetchNextPage
- Bug class is one of: wrong queryKey, missing await, race on concurrent mutations, rollback path, error→empty precedence, IntersectionObserver lifecycle, toast→navigation order
- Network can be mocked with MSW (no real browser primitive needed)

# When NOT to use

- Pure logic test → `testing` skill
- Real OAuth / upload / multi-page journey → Playwright E2E
- Single component with no async, no providers → plain RTL test, no MSW

# Before you write the sketch — MANDATORY

1. Read the component file. Confirm props, accessible names, copy text, ARIA roles. The PR-1 workflow showed 3 of 4 fictional sketches had wrong Korean copy.
2. Read the hook file. Confirm queryKey shape, whether optimistic branches are gated by cache presence, what cancels what.
3. Confirm MSW handlers exist for EVERY query the component fires (`onUnhandledRequest:'error'` surfaces gaps immediately).

# Filename convention

`*.integration.test.tsx` — MUST match this pattern to be picked up by the integration Vitest project. Plain `*.test.tsx` runs in the unit project (no MSW).

# Reference patterns

- `apps/web/src/board/components/RecentPostCardList.integration.test.tsx` — infinite-query list with pagination + empty + error states
- `apps/web/src/comment/components/CommentInput.integration.test.tsx` — form with onSubmit callback (uses vi.fn + deferred, NOT MSW — see "form-with-callback" rule below)
- (PR-3 will add) usePostLikes.integration.test.tsx, RouteGuards.integration.test.tsx, PermissionErrorBoundary.unit.test.tsx, PostDetailPage.integration.test.tsx

# Core rules

- Accessibility-first queries: `getByRole+name` first, `getByLabelText` second, `getByPlaceholderText` third, `data-testid` last
- Never assert on `className`, `useEffect` call counts, or React internals — only on rendered output and observable side effects
- Mock the network with MSW, NEVER mock the Supabase SDK
- Form / callback-driven components: mock with `vi.fn() + deferred()`, do NOT reach for MSW when the network is upstream of the component
- Use `react-intersection-observer`'s `mockAllIsIntersecting` — not a global IntersectionObserver stub
- Loader tests: use `createMemoryRouter` + `RouterProvider`, NEVER nest inside `MemoryRouter`
- Optimistic-mutation tests: prefer a thin Harness over a real product component when the product UI hides the asserted state

# Pre-flight checklist

- [ ] Read the component source
- [ ] Read the hook source
- [ ] Confirmed all queries have MSW handlers (or test uses `vi.fn` for callback components)
- [ ] Used real import paths
- [ ] Used real Korean copy (extract to `messages.ts` when adding new strings — decision D-1)
- [ ] No fictional props
- [ ] Per-test cleanup: handled automatically by `setupTest.integration.ts` (`server.resetHandlers()` + `handlerResets`); only add manual cleanup for `localStorage` / `sessionStore` when your test writes them

# Anti-patterns to refuse

- "I'll add `aria-label` to make my test pass" → fine only if a real a11y improvement
- "I'll mock the Supabase client" → no; mock the network with MSW
- "I'll assert on `queryClient.getQueryState().isInvalidated`" → only if the queryKey IS the contract under test
- "I'll use fake timers for the rapid-click race" → use `userEvent.setup({delay:null})` + MSW `delay()`
- "I'll test PermissionErrorBoundary through the loader" → no; test the component directly with stubbed `useRouteError`. Loader integration test should be ONE thin test, not the whole branch matrix.
```

**Step 2: Validate skill discovery**

Run `cat .claude/skills/integration-testing/SKILL.md | head -5` and confirm the frontmatter parses (no YAML errors).

**Step 3: Commit**

```
docs(skill): integration-testing 스킬 추가

- 컴포넌트/훅이 React Query 캐시·MSW Supabase·data-router loader를 건드릴 때 적용
- 기존 testing 스킬(순수 함수 단위 테스트)을 대체하지 않고 별도 계층으로 추가
```

---

### Task PR-2-8: Reference test for Pattern 1 — RecentPostCardList infinite-list

**Files:**
- Create: `apps/web/src/test/fixtures/post.ts`
- Create: `apps/web/src/test/msw/handlers/posts.ts`
- Create: `apps/web/src/test/msw/handlers/userBlocks.ts`
- Create: `apps/web/src/test/msw/handlers/userProfiles.ts`
- Modify: `apps/web/src/test/msw/handlers/index.ts` — register new handlers + resets
- Create: `apps/web/src/board/components/RecentPostCardList.integration.test.tsx`
- Modify: `apps/web/src/board/components/RecentPostCardList.tsx` — verify empty-state CTA is `role='button'` (workflow finding)

**Before writing:** read `RecentPostCardList.tsx:30-137`, `useRecentPosts.ts:11-42`, `useBatchPostCardData.ts`, `useBlockedByUsers`. Confirm copy: `게시판이 비어있어요` / `글 쓰러 가기`. Confirm fetch target: `/rest/v1/posts_feed` (NOT `/posts`).

**Step 1: Add `react-intersection-observer/test-utils`**

```bash
pnpm --filter web add -D react-intersection-observer
```

(Already in `dependencies` if `useInView` is used; add only if missing — verify with `grep`.)

**Step 2: Create fixture**

`apps/web/src/test/fixtures/post.ts`:

```typescript
import type { Post } from '@post/types/Post';

export function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    boardId: 'b1',
    title: 'Test post',
    content: 'body',
    authorId: 'u1',
    createdAt: new Date('2026-01-15').toISOString(),
    updatedAt: new Date('2026-01-15').toISOString(),
    commentsCount: 0,
    countOfLikes: 0,
    ...overrides,
  };
}
```

(Adjust shape to match the actual `Post` type — read the file first.)

**Step 3: Create MSW handlers**

Implement `postsFeedHandler({posts, onRequest})` that:
- Matches `GET ${SUPABASE_URL}/rest/v1/posts_feed`
- Parses `created_at` searchParam for `lt.<iso>` cursor
- Respects `limit` searchParam (default to 7 if missing)
- Calls `onRequest(new URL(request.url))` if provided

Implement `userBlocksHandler` (default `[]`) and `userProfilesBatchHandler` (default empty map). Wire reset functions if any of them have stateful behavior (they shouldn't).

**Step 4: Register in handler registry**

In `apps/web/src/test/msw/handlers/index.ts`, add new handler exports to the `handlers` array. No new reset functions needed if all are stateless.

**Step 5: Write the failing reference test**

`apps/web/src/board/components/RecentPostCardList.integration.test.tsx`. Use the sketch from the workflow's `finalDesign.finalPatterns[0].testSketch` — four tests: page-1+cursor round-trip, double-fire dedup, empty state, error precedence.

Run: `pnpm --filter web test:run RecentPostCardList.integration.test.tsx`. Expected: FAIL (because the component changes from Step 6 haven't landed).

**Step 6: Apply component change**

In `RecentPostCardList.tsx`, ensure the empty-state CTA renders as `<button>` (or `<Button>` from `@/shared/ui/button` with no `asChild`), not a `Link`. Verify by inspection.

**Step 7: Run reference test**

`pnpm --filter web test:run RecentPostCardList.integration.test.tsx` — all 4 tests pass.

**Step 8: Commit**

```
test(board): RecentPostCardList 무한스크롤 통합 테스트 추가

- 패턴 1 reference — 페이지네이션 cursor round-trip, sentinel double-fire 중복 차단, 빈 상태/에러 상태 우선순위 검증
- MSW handler 팩토리 패턴: postsFeedHandler({posts, onRequest})로 future infinite-query 테스트 재사용
```

---

### Task PR-2-9: Reference test for Pattern 4 — CommentInput form-with-callback

**Files:**
- Create: `apps/web/src/comment/components/CommentInput.integration.test.tsx`

Before writing: read `CommentInput.tsx`. Confirm placeholder copy (`재밌게 읽었다면 댓글로 글값을 남겨볼까요?`). This pattern does NOT use MSW — `CommentInput` takes `onSubmit` callback.

**Step 1: Write the failing test**

Use the sketch from `finalDesign.finalPatterns[3].testSketch` — four tests: in-flight disabled state, double-click dedup, whitespace rejection, error path retains input. All use `vi.fn() + deferred()`.

Run: `pnpm --filter web test:run CommentInput.integration.test.tsx`. Expected: PASS (no component changes needed — `aria-label` already shipped in PR-1).

**Step 2: Commit**

```
test(comment): CommentInput 콜백 폼 통합 테스트 추가

- 패턴 4 reference — onSubmit prop을 받는 컴포넌트는 네트워크가 상류에 있어 MSW가 아니라 vi.fn + deferred로 in-flight 상태 정밀 제어
- 이중 클릭 dedup, 공백 거부, 에러 시 입력 보존 — 폼 mutation 테스트의 공용 시나리오
```

---

### Task PR-2-10: Guard-rail tests (G-1..G-5)

**Files:**
- Create: `apps/web/src/test/infra.integration.test.tsx`

**Step 1: Write 5 tests**

Following `pr-test-analyzer`'s recommendations:

- **G-1** `resetAuthHandlerState isolates between tests` — two `it()` blocks; first signs in via `POST /auth/v1/token`; second asserts `GET /auth/v1/user` returns 401.
- **G-2** `setSession flows to GET /auth/v1/user` — mount a tiny harness component that calls `useAuth()`, sign in via password grant, assert hook returns the user.
- **G-3** `deferred gates loading state` — mount harness using `useQuery` with `queryFn: () => deferredPromise`; assert loading → success transition is observable.
- **G-4** `retry: false prevents retries` — MSW returns 500 once; assert error state observed on first attempt (not after retries).
- **G-5** `onUnhandledRequest: 'error' throws` — unhandled fetch inside test should reject; wrap in `expect().rejects.toThrow()`.

Each test ~10 lines.

**Step 2: Run and commit**

`pnpm --filter web test:run infra.integration.test.tsx` — all 5 pass.

```
test(infra): 통합 테스트 계층 guard-rail 5종 추가

- G-1 resetAuthHandlerState 테스트 간 격리
- G-2 setSession → GET /auth/v1/user end-to-end
- G-3 deferred 기반 loading-state 결정성
- G-4 retry: false 적용 검증 (CI 6배 슬로우다운 방지)
- G-5 onUnhandledRequest: 'error' 동작 확인
```

---

### Task PR-2-11: Open PR-2

**Step 1: Push branch**

```bash
git push -u origin feat/integration-testing-2-skill-and-first-tests
```

**Step 2: Create PR**

`gh pr create --base main --head feat/integration-testing-2-skill-and-first-tests --title "test(infra): integration-testing 스킬 + 첫 2개 reference (2/3)" --body ...`

Body should include stack context (depends on #656 merging first; followed by PR-3), the 5 deferred review items now resolved (S-2..S-7), the two reference patterns shipped, the guard-rail tests, and the open D-4 question for PR-3.

**Step 3: Confirm with user before push** (per project working pattern from prior sessions).

---

## PR-3 — Remaining 3 reference patterns + routeConfig extraction

**Branch:** `feat/integration-testing-3-remaining-patterns` off merged `main` (after PR-2 lands).

**Patterns shipped:** Pattern 2 (optimistic-mutation — `usePostLikes`), Pattern 3 (protected-route — `RouteGuards`), Pattern 5 (loader-driven — `PermissionErrorBoundary` unit + `PostDetailPage` integration).

### Task PR-3-1: Extract routeConfig.ts

**Files:**
- Create: `apps/web/src/routeConfig.ts`
- Modify: `apps/web/src/router.tsx` — import `routes` from new module

**Before:** read all 382 lines of `router.tsx`. Identify the `routes` array passed to `sentryCreateBrowserRouter`. Verify Sentry instrumentation wraps the router, not the routes array — so extraction is safe.

**Step 1: Cut routes into new file**

Move the routes array (and any local-only helpers like `RootLayout`, `rootRedirectRoute`, etc.) into `routeConfig.ts`. Export as `export const routes = [...]`.

**Step 2: Import in router.tsx**

```typescript
import { routes } from './routeConfig';
// existing router.tsx keeps: imports, sentry wrapping, RouterProvider creation
const router = sentryCreateBrowserRouter(routes);
```

**Step 3: Smoke test**

Add to `apps/web/src/router.test.ts` (or create): assert `import { routes } from './routeConfig'` equals `import { routes } from './router'` by identity (re-export must be the same const).

**Step 4: Manual verification**

Run `pnpm --filter web dev` briefly, navigate to `/boards` — confirm the app boots and routing works.

**Step 5: Commit**

```
refactor(router): routes를 routeConfig.ts로 추출

- 통합 테스트의 createMemoryRouter가 production router와 같은 routes 참조 — drift 방지
- Sentry instrumentation은 여전히 router를 wrap (routes는 wrap 대상 아님)
```

---

### Task PR-3-2: Reference test for Pattern 2 — usePostLikes optimistic mutation

**Files:**
- Create: `apps/web/src/test/msw/handlers/likes.ts`
- Modify: `apps/web/src/test/msw/handlers/index.ts`
- Create: `apps/web/src/post/hooks/usePostLikes.integration.test.tsx`

**Before:** read `usePostLikes.ts:70-175`. Note the `cancelQueries`/`onMutate`/`onError`/`onSuccess` chain and the cache-seed precondition.

**Step 1: Create likes handler factory**

Per the workflow's `finalDesign.finalPatterns[1].mswHandlers` description — `likesHandlers({initialCount, failPost, latencyMs})`. Default GET returns `[]`; POST returns 201; DELETE returns 204. Per-test override via factory args.

**Step 2: Write the failing test with LikeHarness**

Use sketch from `finalDesign.finalPatterns[1].testSketch`. Three tests: optimistic increment + persist, rollback on 500, rapid double-click dedups to one POST. `LikeHarness` is defined inline in the test file — DO NOT export it (it's test-only).

Run: should pass once handlers and harness are right.

**Step 3: Commit**

```
test(post): usePostLikes 낙관적 mutation 통합 테스트 추가

- 패턴 2 reference — cancelQueries/onMutate/onError/onSuccess 체인 검증
- PostLikeButton 대신 LikeHarness 사용: 실제 버튼은 작성자에게 카운트를 숨기고 비작성자에게 비활성 — 낙관적 카운트가 동시에 보이며 클릭 가능한 real-user config 없음 (workflow finding)
```

---

### Task PR-3-3: Reference test for Pattern 3 — protected-route with returnTo

**Files:**
- Create: `apps/web/src/test/utils/renderAppAt.tsx`
- Create: `apps/web/src/shared/components/auth/RouteGuards.integration.test.tsx`

**Before:** read `RouteGuards.tsx:10-26`, `RootRedirect.tsx:13-35`, `routingDecisions.ts:7-61` (already unit-tested per commit `629df28b` — DO NOT duplicate), `useAuth.tsx:38-79`, and `@/shared/lib/storage` (NOT `@/shared/utils/sessionStore` — workflow caught the wrong path).

**Step 1: Create renderAppAt helper**

`apps/web/src/test/utils/renderAppAt.tsx`:

```typescript
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { routes } from '@/routeConfig';
import { withProviders, type WithProvidersOptions } from './withProviders';

export function renderAppAt(path: string, opts: WithProvidersOptions = {}) {
  const { Wrapper, queryClient } = withProviders(opts);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(<RouterProvider router={router} />, { wrapper: Wrapper });
  return { ...result, router, queryClient, user: userEvent.setup({ delay: null }) };
}
```

**Step 2: Write the failing test**

Use sketch from `finalDesign.finalPatterns[2].testSketch` — four tests including the parameterized open-redirect guard (`//evil.com`, `http://`, `javascript:`, `/login`).

`beforeEach` clears `sessionStore`, `localStorage`, `resetAuthHandlerState`.

**Step 3: Commit**

```
test(auth): 보호 라우트와 returnTo 라운드트립 통합 테스트 추가

- 패턴 3 reference — PrivateRoutes ↔ sessionStore ↔ RootRedirect 핸드오프
- 파라미터화 open-redirect 방어 (//evil.com, javascript:, /login은 returnTo로 저장되지 않음)
- renderAppAt 헬퍼: createMemoryRouter + RouterProvider 부팅 — loader 테스트의 기반
```

---

### Task PR-3-4: Reference test for Pattern 5 — PermissionErrorBoundary unit + PostDetailPage integration

**Files:**
- Create: `apps/web/src/shared/components/PermissionErrorBoundary.unit.test.tsx`
- Create: `apps/web/src/post/components/PostDetailPage.integration.test.tsx`

**Before:** read `usePostDetailLoader.ts:16-59`, `PermissionErrorBoundary.tsx:17-89`, `postLoaderAccess.ts:23-61` (already unit-tested per commit `629df28b` — DO NOT duplicate), `@/shared/lib/storage` for `STORAGE_KEYS.BOARD_ID`.

**Step 1: Resolve D-4 — verify HttpResponse.error() classification**

Write a one-off scratch test that imports supabase-js, registers an MSW handler returning `HttpResponse.error()` for `/rest/v1/posts`, calls `supabase.from('posts').select()`. Inspect the error type. If it surfaces as `SupabaseNetworkError`, use `HttpResponse.error()` in the test. If not, return status 503 directly and adjust `mapPostLoaderError`.

Document the finding in a comment in the PostDetailPage test.

**Step 2: Write PermissionErrorBoundary unit test (no MSW, no router)**

Use sketch from `finalDesign.finalPatterns[4].testSketch` File 1. Mocks `react-router-dom`'s `useRouteError`, asserts:
- 403 → `읽기 권한 없음` dialog; confirm clears `STORAGE_KEYS.BOARD_ID` BEFORE navigating
- 503 → `네트워크 오류` dialog; retry button calls `window.location.reload`
- Generic 400 → fallback with status code shown

**Step 3: Write PostDetailPage integration test**

Use sketch from File 2. ONE test per error class, proves loader → errorElement wiring. Uses `renderAppAt('/board/b1/post/xyz')`.

**Step 4: Commit (one commit per file to keep granularity)**

```
test(shared): PermissionErrorBoundary 단위 테스트 — 다이얼로그 분기와 부작용 순서 검증
```

```
test(post): PostDetailPage loader → errorElement 통합 테스트
```

---

### Task PR-3-5: Open PR-3

Stack context: depends on PR-1 (#656) AND PR-2. Cite the 3 reference patterns shipped + `routeConfig.ts` extraction + D-4 resolution.

---

## Out of scope (explicit non-goals)

Documented in the workflow's `finalDesign.risksAndOpenQuestions`. Do NOT add these in PR-2 or PR-3 — track as future work in the skill's "follow-up coverage" section:

- Multi-identity cache pollution scenarios
- Stale-snapshot under concurrent error
- Sentry assertion patterns (verifying `captureException` was called with right args)
- Replication-lag tests
- The other 3 form shapes (`LoginPage`, `usePostSubmit`, `useUpdateUserData`) — per D-2, document differences in the skill, write tests only when a real use case demands

## Decision rubric (from workflow `finalDesign.pyramidRubric`)

| If the test... | Tier | Examples |
|---|---|---|
| ...exercises only pure functions, no DOM, no providers | Unit (`testing` skill) | `getNextPageParam`, `isSafeReturnTo`, `mapPostLoaderError`, zod schemas, queryKey factories, `checkBoardAccess` |
| ...needs a React Query cache + MSW-mocked Supabase + one component or hook to verify a seam | Integration (`integration-testing` skill — this stack) | infinite-list cursor + sentinel, optimistic-rollback, returnTo round-trip, loader → errorElement, form submit + loading |
| ...needs a real browser engine (OAuth redirect, file upload, clipboard, service worker, real Supabase RLS, multi-page journey) | E2E (Playwright, 5–15 tests total) | Google sign-in, image upload to Firebase Storage, write-post-then-comment-then-read-notification |

**Decision shortcuts:**
- "Can I mock the network deterministically?" Yes → Integration. No (network behavior IS the test) → E2E.
- "Is the network upstream of the component (component takes a callback)?" → Integration with `vi.fn() + deferred()`; MSW belongs in the container test.
- "Is the behavior testable on a pure function extracted from the component?" Yes → Unit, and extract that function (per `refactoring` skill).
- E2E budget: ANY new E2E test must REPLACE an existing one, never augment. The suite is the deploy bottleneck.

## References

- Workflow output: `/private/tmp/claude-501/-Users-bumgeunsong--superset-worktrees-daily-writing-friends-snow-mascarpone/969ee7e8-3851-434f-bb89-3a2eff433893/tasks/whmceqf6j.output` (may be GC'd)
- Multi-agent review: PR #656 commit history + this plan's "Open decisions" + "Multi-agent review items"
- Memory: `~/.claude/projects/-Users-bumgeunsong-coding-daily-writing-friends/memory/project_integration_testing_stack.md`
