# Integration Test Design

Applies to code the [quadrant](strategy.md) marked integration (quadrant 3: shallow decision, many dependencies): a component subtree, custom hook, or router-loader contract where behavior crosses a seam (hook↔cache, cache↔render, loader↔errorElement, form↔callback, sentinel↔fetchNextPage).

## Contents

1. [Before you write — MANDATORY reads](#0-before)
2. [Narrow, clear test boundary (SUT)](#1-boundary) · [1.1 how far to scope the SUT](#11-sut)
3. [Assert user-observable results](#2-observable)
4. [Find elements by accessible meaning](#3-queries) · [3.1 screen-text selectors](#31-selectors)
5. [Mock only the outer ring](#4-mock)
6. [Auth: `signInAs` vs `vi.mock(useAuth)`](#5-auth)
7. [Unhandled network fails by default](#6-unhandled)
8. [Given / When / Then](#7-gwt)
9. [One policy-failure cause per test](#8-one-policy)
10. [Checklist](#9-checklist)

## File convention

- Extension: `*.integration.test.tsx` (**required** — routes to the `integration` Vitest project with MSW via `setupTest.integration.ts`). Missing the suffix → unit project, no MSW → silent false green.
- Render with `renderWithProviders` (`src/test/utils/renderWithProviders.tsx`: MemoryRouter + QueryClient `retry:false` + AuthProvider + NavigationProvider). Loader tests use `createMemoryRouter` + `RouterProvider` instead (see [§3](#3-queries) note).
- Reference tests: `apps/web/src/board/components/RecentPostCardList.integration.test.tsx` (infinite-query list: pagination + empty + error), `apps/web/src/comment/components/CommentInput.integration.test.tsx` (form + callback with `vi.fn` + `deferred`, not MSW).

## 0. <a id="0-before"></a>Before you write — MANDATORY

Fictional Korean copy is the #1 failure mode: it type-checks, then fails at runtime when `getByText` can't find a string the component never renders.

1. **Read the component file** — confirm props, accessible names, copy text, ARIA roles.
2. **Read the hook file** — confirm queryKey shape, whether optimistic branches are gated by cache presence, what cancels what.
3. **Confirm MSW handlers exist** for every query the component fires (`onUnhandledRequest:'error'` surfaces gaps).

New user-facing strings: extract to the feature's `messages.ts` rather than inlining.

## 1. <a id="1-boundary"></a>Narrow, clear test boundary

Full-funnel / full-app mount is nearly banned. A good boundary:
- actually passes through the policy boundary under test
- avoids unrelated routes, redirects, initial steps, overlays, queries
- on failure, narrows the cause to one policy violation

```text
❌ mounting the whole funnel — initial step, redirect, bridge never reach the policy screen
✅ enter the fulfillment container directly with design = WHITE; user taps 편의점 픽업;
   assert BlackOnly notice shows and pickup does NOT proceed
```

### 1.1 <a id="11-sut"></a>How far to scope the SUT

The **SUT** (system under test) is the range you actually mount and run together — that unit plus everything wired to it. Inside the range runs for real; only the outer ring (external systems) is faked. So the SUT scope IS the guarantee scope.

- **too wide** → collaborators balloon, prep gets heavy, failures are hard to localize.
- **too shallow** → the policy is half outside the range; the test can't see it.

Default SUT = the **component/container**, because the policy completes only after query→model→render. Drop to a **hook** SUT only when the policy lives entirely in one hook AND that hook **does not fetch its own data** (grep-checkable):

1. no `useQuery`/`useSuspenseQuery` in the hook file (no self-fetch / ambient reads)
2. every input the policy depends on is a function parameter (primitive/prop/id)
3. output is a return value or an outer-ring side effect (navigate/overlay/storage), not rendered JSX
4. the container only wires query→prop + calls the hook; it doesn't re-implement the policy

If 1–2 break, the container is the SUT. For a hook SUT, render a thin Harness that calls the hook and returns `null`; no MSW needed since there's no fetch.

```tsx
function EntryHarness(props: EntryProps) {
  useEntryBottomSheet({ ...props, nudgeDelayMs: 50 }); // inject seams as params
  return null;
}
renderWithProviders(<EntryHarness showNotice hasCard />);
```

## 2. <a id="2-observable"></a>Assert user-observable results

Never assert internal state, hook-call counts, model-function calls, `className`, or React internals — unit does that better. Assert rendered output and observable side effects.

```ts
// ✅
await user.click(await screen.findByRole('button', { name: /편의점 픽업/ }));
expect(await screen.findByRole('heading', { name: /블랙 카드만 가능/ })).toBeInTheDocument();
expect(onConfirmPickup).not.toHaveBeenCalled();

// ❌
expect(pickupState).toBe('blockedByPolicy');
expect(openBlackOnlyBottomSheet).toHaveBeenCalledTimes(1);
```

**Callbacks are the exception**: a callback that means "advance to the next step" (`onConfirmPickup`, `onPassed`) is an observable flow-transition signal. A notice showing is not enough — if the notice shows AND the callback fires, that's the real bug. Assert notice-shown + callback-not-called together.

## 3. <a id="3-queries"></a>Find elements by accessible meaning

Query priority (higher = closer to how users perceive):

```text
1. getByRole (+ name)   2. getByLabelText   3. getByPlaceholderText
4. getByText            5. getByDisplayValue 6. getByAltText/Title   7. getByTestId (last resort)
```

```ts
// ✅
screen.findByRole('button', { name: /편의점 픽업/ });
// ❌ DOM-structure coupling
screen.findByText('편의점 픽업').closest('li')?.querySelector('button');
```

- Infinite-list / IntersectionObserver: use `react-intersection-observer`'s `mockAllIsIntersecting`, not a global stub.
- **Loader tests**: `createMemoryRouter` + `RouterProvider`, never nested inside `MemoryRouter`. Keep loader integration to ONE thin test; test `errorElement`/boundary directly with a stubbed `useRouteError`, not through the loader.

### 3.1 <a id="31-selectors"></a>Screen-text selectors

**Copy/images are not the assertion target — only the decision that selects them is.** Screen text is a selector to find the element; whether the exact wording is right is the copywriter's/i18n's job, not the test's.

Selector regex keeps **domain noun-phrases only**, dropping particles/endings/modifiers. Standard: **survives a tone-only copy edit, breaks on a policy change that describes a different feature.**

```ts
// ✅ domain noun-phrase
screen.findByRole('button', { name: /교통비.*충전/ });
// ❌ full-sentence literal — breaks on tone edits ('토스에서', '할 수 있어요')
screen.findByRole('button', { name: /토스에서 교통비를 충전할 수 있어요/ });
```

- **Uniqueness (both directions).** The noun-phrase must match **uniquely on that screen**. A loose phrase matching another element gives a silent false negative (positive) or an over-broad absence claim (`queryBy` + `not.toBeInTheDocument`). If several candidates exist, narrow by `role`/`level` first, then add the minimal distinguishing token.
- **Short static labels** (≤3 words, e.g. `'자세히 보기'`) may match in full.
- **Dynamic policy values** (amount/date/count like `3,500원`) ARE policy output — find the element by `role`, assert the value with `toHaveTextContent`, not by putting the value in the selector.
- **Banned: reusing production constants or `messages.ts`/i18n values as the expected string** — that's tautological (a typo in the constant is expected right back). Use a domain noun-phrase regex extracted from what actually renders.
- **Images**: don't assert URL strings. If image *selection* is a policy branch, unit-test that decision; if mere presence is the branch result, assert existence via `alt`/role.

## 4. <a id="4-mock"></a>Mock only the outer ring

The rule is **ownership**: run for real any code we can fix; fake only external systems another team owns.

**Fake (outside our repo):**
- Backend HTTP (Supabase REST `/rest/v1`, `/auth/v1`) → **MSW** (`src/test/msw/`)
- Browser navigation (`location.href`) → the app's navigation seam
- Browser runtime (DOM, storage) → happy-dom / jsdom

**Run for real (our repo):** API adapter modules, query/hooks, model/selector, container/component/UI, pure domain logic.

- **Never mock the Supabase SDK / client.** Mock the **network** with MSW. Cutting `vi.mock('.../supabase')` (an inner layer) stops real parsing/mapping/envelope handling, shrinks the code actually exercised, and couples the test to a module's shape. Bug protection and refactor resistance both weaken.
- **Mock = the device that isolates the policy under test**, not convenient fake data. Ask: what policy condition does this mock create? which fields must match the real API shape? could this mock make the test pass/fail for the wrong reason?
- **Form / callback-driven components** (network is upstream of the component): mock with `vi.fn()` + `deferred()` (`src/test/utils/deferred.ts`), NOT MSW. See `CommentInput.integration.test.tsx`.
- **URL query** the SUT reads: set it with `window.history.pushState({}, '', '/path?postId=42')` before render; reset in `afterEach`.

## 5. <a id="5-auth"></a>Auth: `signInAs` vs `vi.mock(useAuth)`

Pick per seam under test, not by preference.

**Use `signInAs(email)` (`@/test/utils/signInAs`)** when the seam IS the auth boundary or trusts the auth-state shape (protected routes, loader-driven pages, RouteGuards, returnTo round-trip), or when a regression in `AuthProvider`'s `onAuthStateChange` / `mapToAuthUser` / `UUID_RE` should fail this test. See `infra.integration.test.tsx` G-2.

**Use `vi.mock('@/shared/hooks/useAuth')`** when the seam is downstream of auth (form callbacks, list cursor, presentational render), or the component reads `currentUser` only to gate an early-return the test doesn't exercise. State which seam in the test's JSDoc preamble.

## 6. <a id="6-unhandled"></a>Unhandled network fails by default

`setupTest.integration.ts` runs `server.listen({ onUnhandledRequest: 'error' })`. Asset/logging/analytics requests get an **explicit** noop handler or ignore rule — "deliberate ignore", never "silent ignore". Never mock the Supabase SDK to dodge a missing handler; add the handler.

## 7. <a id="7-gwt"></a>Given / When / Then

```text
Given: mocks + context that create the policy condition
When:  the real user action
Then:  user-observable result + boundary effects
```

Write the assertion as a sentence first. Keep the 3-part structure but **no `// Given/When/Then` comments** — separate with blank lines. `userEvent.click` IS the action; `expect` IS the check; the comments just repeat what the code says.

```ts
mockSelectedCardDesign('WHITE');

await user.click(await screen.findByRole('button', { name: /편의점 픽업/ }));

expect(await screen.findByRole('heading', { name: /블랙 카드만 가능/ })).toBeInTheDocument();
expect(onConfirmPickup).not.toHaveBeenCalled();
```

## 8. <a id="8-one-policy"></a>One policy-failure cause per test

When one user action spins off several policies, split into one `it` per policy. Standard: "does this assertion failing have a single explanation?" `describe` = the situation the user is in; `it` = a single result that must hold.

## 9. <a id="9-checklist"></a>Checklist

1. Does the test state, in one sentence, the real bug it blocks?
2. Is the boundary narrow enough that a failure localizes to one policy?
3. Do assertions look at user-observable results (+ callback signals)?
4. Do you drive the UI by `role`/`name`, not DOM structure?
5. Does each mock isolate the policy condition?
6. Is only the outer ring faked (Supabase HTTP via MSW / DOM via jsdom)? Did you avoid mocking the Supabase SDK?
7. Is mock data close enough to the real API/domain shape?
8. Are new network requests never silently ignored (`onUnhandledRequest:'error'`)?
9. Does the name state situation → action → observable result?
10. Text matching = domain noun-phrase regex (not full sentences / constants / `messages.ts`), unique on the screen (positive AND absence)? Dynamic values via `role` + `toHaveTextContent`?
11. Does a realistic mutation break the test? ([verification.md](verification.md))
12. From the failure message alone, is the broken policy clear?
