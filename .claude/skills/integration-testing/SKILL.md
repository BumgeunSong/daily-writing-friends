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

1. Read the component file. Confirm props, accessible names, copy text, ARIA roles. Fictional Korean copy is the #1 failure mode for AI-written test sketches — type-checks fine, fails at runtime when `getByText` can't find a string the component never renders.
2. Read the hook file. Confirm queryKey shape, whether optimistic branches are gated by cache presence, what cancels what.
3. Confirm MSW handlers exist for EVERY query the component fires (`onUnhandledRequest:'error'` surfaces gaps immediately).

# Filename convention

`*.integration.test.tsx` — MUST match this pattern to be picked up by the integration Vitest project. Plain `*.test.tsx` runs in the unit project (no MSW).

# Reference patterns

- `apps/web/src/board/components/RecentPostCardList.integration.test.tsx` — infinite-query list with pagination + empty + error states
- `apps/web/src/comment/components/CommentInput.integration.test.tsx` — form with onSubmit callback (uses vi.fn + deferred, NOT MSW — see "form-with-callback" rule below)

# Core rules

- Accessibility-first queries: `getByRole+name` first, `getByLabelText` second, `getByPlaceholderText` third, `data-testid` last
- Never assert on `className`, `useEffect` call counts, or React internals — only on rendered output and observable side effects
- Mock the network with MSW, NEVER mock the Supabase SDK
- Form / callback-driven components: mock with `vi.fn() + deferred()`, do NOT reach for MSW when the network is upstream of the component
- Use `react-intersection-observer`'s `mockAllIsIntersecting` — not a global IntersectionObserver stub
- Loader tests: use `createMemoryRouter` + `RouterProvider`, NEVER nest inside `MemoryRouter`
- Optimistic-mutation tests: prefer a thin Harness over a real product component when the product UI hides the asserted state

# Auth: mock `useAuth` or sign in via `signInAs`?

Two valid paths, picked per seam under test — NOT per author preference.

**Use `signInAs(email)` from `@/test/utils/signInAs`** when:
- The seam under test IS the auth boundary or trusts the auth state shape (protected routes, loader-driven pages, RouteGuards, returnTo round-trip).
- A regression in `AuthProvider`'s `onAuthStateChange` subscription, `mapToAuthUser`, or `UUID_RE` validation should fail this test.
- See `infra.integration.test.tsx` G-2 for the round-trip pattern.

**Use `vi.mock('@/shared/hooks/useAuth')`** when:
- The seam is downstream of auth (form callbacks, infinite-list cursor, presentational rendering).
- The component reads `currentUser` only to gate an early-return that the test doesn't exercise.
- Wiring up `signInAs` would couple the test to `AuthProvider`'s lifecycle without proving anything new.

Both reference patterns in this PR use the mock — their JSDoc preambles state which seam they target. When a future test mounts `RouterProvider` or asserts on access decisions, switch to `signInAs`.

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
