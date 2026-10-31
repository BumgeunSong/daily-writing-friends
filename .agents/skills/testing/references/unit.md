# Unit Test Design

Applies to code the [quadrant](strategy.md) marked unit (quadrant 1: deep decision, few dependencies).

## Contents

1. [Name = input condition + output contract](#1-name)
2. [Output-based only](#2-output-based) · [2.1 boundary + exception as one set](#21-boundary)
3. [Grow the pure-function area](#3-grow-pure)
4. [Pure-function candidates](#4-candidates)
5. [When output-based won't work](#5-fallbacks)
6. [No internal export](#6-no-export)
7. [Write inputs directly](#7-explicit-inputs)
8. [No logic in the test body](#8-no-logic)
9. [Checklist](#9-checklist)

## File convention

- Location: next to the target file (or a sibling `__tests__/`).
- Extension: `*.test.ts` / `*.test.tsx` (runs in the `unit` Vitest project, no MSW).

```text
src/user/utils/userMappers.ts
src/user/utils/userMappers.test.ts   ← unit
```

## 1. <a id="1-name"></a>Name = input condition + output contract

Unit tests verify small decision logic. The name reveals **which output contract is guaranteed under which input condition**, in domain language. Follow [naming.md](naming.md) for `it`/`describe`/enum rules.

```ts
describe('홈 배너 목적지를 정할 때', () => {
  it.each([
    { caseName: '티머니 충전 안내 배너는 교통 홈으로 보낸다', bannerType: 'TransportationAnnouncement', expected: 'transportationIndex' },
    { caseName: '빈 배너는 이동 목적지를 만들지 않는다',        bannerType: 'EMPTY',                       expected: null },
  ])('$caseName', ({ bannerType, expected }) => {
    expect(getHomeTopBannerDestination(bannerType)).toBe(expected);
  });
});
```

## 2. <a id="2-output-based"></a>Output-based only

> **Why.** Of the four pillars of a good test (regression protection, refactor resistance, fast feedback, maintainability), the first three can't all be maxed. So we pin **refactor resistance to max**: asserting only on the return value doesn't bind to implementation details, so behavior-preserving refactors don't break the test and false positives vanish.

We use output-based (assert the return value) only. State-based and interaction-based (call-count) tests couple to implementation and break on refactor — not for unit.

```ts
it('WHITE는 픽업 재고가 있어도 blockedByPolicy다', () => {
  const result = computePickupState({ design: 'WHITE', pickupStock: 3, pickupEnabled: true });
  expect(result).toBe('blockedByPolicy');
});
```

### 2.1 <a id="21-boundary"></a>Not just happy path — boundary + exception as one set

Write all three kinds for a function. Checking only the happy path leaves regression holes.

| Kind | Example |
|---|---|
| **Happy path** — normal policy pass | `BLACK + 재고 있음 + enabled → available` |
| **Policy boundary** — input where a branch flips | `BLACK + 재고 0 → outOfStock`, `BLACK + 재고 1 → available` |
| **Exception / forbidden** — input where a bug must not happen | `WHITE + 재고 있음 → blockedByPolicy`, `null`, `undefined`, `[]`, negative, future date |

**Boundaries by input type:**
- number → `0`, negative, max, overflow
- array → empty, single, duplicate
- string → empty, whitespace-only, very long
- enum/union → **every** value (via `it.each`)
- date → past/present/future, timezone edges
- nullable → `null`, `undefined`, empty-but-truthy (`''`, `0`, `[]`)

### Output branches are a stronger signal than inputs

> **If the output is a finite union, write one input that reaches each member.**

Users see the output. Keying on output members prevents an input matrix from accidentally piling onto one branch. If `HomeBannerType` has 10 values, the test has ≥10 cases.

```ts
it.each<{ input: PickupInput; expected: PickupState }>([
  { input: { design: 'BLACK', pickupStock: 3, pickupEnabled: true },  expected: 'available' },
  { input: { design: 'WHITE', pickupStock: 3, pickupEnabled: true },  expected: 'blockedByPolicy' },
  { input: { design: 'BLACK', pickupStock: 0, pickupEnabled: true },  expected: 'outOfStock' },
  { input: { design: 'BLACK', pickupStock: 3, pickupEnabled: false }, expected: 'unavailable' },
])('$expected 케이스', ({ input, expected }) => {
  expect(computePickupState(input)).toBe<PickupState>(expected);
});
```

Add the `toBe<EnumType>(expected)` type argument — when the enum gains a value, the missing expected surfaces at compile time.

### Alias normalization → cover every group member

If an internal function normalizes several values into one group (`PENDING`/`MAKING` → `'PENDING'`), don't verify only one representative. Put **every alias member** in `it.each` to catch alias bugs. Verify through the caller's output, not by exporting the internal normalizer ([§6](#6-no-export)).

### Multi-gate guards → isolation coverage

If a function handles multiple feature gates, verify **each gate doesn't leak outside its own output**. Two kinds together:

**(a) cross-category isolation** — output of an unrelated category is unaffected when gates are OFF.
**(b) same-category gate independence** — within one category, each output depends on **its own gate only**; other gates OFF have no effect.

```ts
// PickupGuide gates on pickupEnabled only. registerEnabled OFF must not affect it.
it.each([
  { pickupEnabled: true,  registerEnabled: true,  expected: 'PrepaidCardPickupGuide' },
  { pickupEnabled: false, registerEnabled: true,  expected: 'EMPTY' },
  { pickupEnabled: true,  registerEnabled: false, expected: 'PrepaidCardPickupGuide' }, // independence
])(...);
```

Verifying (a) but not (b) misses gate leakage within the same feature family. Keep the matrix from exploding: vary only the policy key, hold the rest fixed.

### Self-check
- output-union member count > test-case count → suspect a missing branch
- alias/normalization exists but only the representative is verified → possible alias bug
- multiple gates but no gate-OFF case for unrelated output → possible cross-category leak
- multiple gates in one category but no independence case → possible same-family leak

If you can't think of new branches/boundaries, re-check whether the function is really deep (quadrant 1). 1–2 cases → candidate for quadrant 2 (don't test).

## 3. <a id="3-grow-pure"></a>Grow the pure-function area

Unit quality is decided by **which code you make pure**, not how you write the test.

- **Pure function (decision logic)** — policy/calc/branch as input → return value. No side effects. Verified without mocks.
- **Outer layer (side effects)** — network/screen/storage. Makes no decision. Verified by integration.

(functional core, imperative shell — see the [refactoring](../../refactoring/SKILL.md) skill.)

> **Time and randomness are side effects too.** A function that reads `Date.now()`/`Math.random()` internally is not pure and becomes flaky. **Inject** the current time/random value as a parameter to keep purity and determinism.

## 4. <a id="4-candidates"></a>Pure-function candidates

- domain models and calculators
- reducers and selectors
- formatters, parsers, mappers (error code → user action)

Test: **"does this return a value, or touch the screen/outside?"** Components/hooks/containers are the outer layer → [integration](integration.md).

## 5. <a id="5-fallbacks"></a>When output-based won't work — pick one

Don't force state/interaction-based tests. Choose:
1. Refactor the decision into a pure function so output-based works.
2. Move to [integration](integration.md) and verify by user-observable result.
3. No decision or low value → don't test (quadrant 2).

## 6. <a id="6-no-export"></a>Don't export internals for testing

Verify the module's exported functions and their return values. Exporting an internal helper for a test couples to implementation and breaks on refactor.

## 7. <a id="7-explicit-inputs"></a>Write inputs directly in each test

Shared `const` + spread override is banned.

```ts
// ❌ shared baseInput — hidden defaults obscure what's verified
const baseInput = { pickupEnabled: true, registerEnabled: true, transportationEnabled: true, clicked: false };
it('Tuba OFF면 비노출', () => {
  expect(getVisible({ ...baseInput, bannerType: 'Transportation', transportationEnabled: false })).toBe('EMPTY');
});

// ✅ explicit — the whole input context is readable from the test alone
it('교통 배너 노출이 꺼지면 비노출', () => {
  expect(getVisible({
    bannerType: 'Transportation',
    pickupEnabled: true, registerEnabled: true, transportationEnabled: false, clicked: false,
  })).toBe('EMPTY');
});
```

Why: hidden defaults (must scroll up); shield effect (a default that accidentally matches the policy → false negative); silent coupling (one const edit silently changes every test); DRY myth (tests aren't production — WET > DRY).

If inputs are too many to repeat, that's a signal the signature is wide → **reduce inputs by refactoring first**.

**Exception 1 — boolean/enum matrix: `it.each`.** A truth table is clearer than repeated literals.

**Exception 2 — builder.** When fields are truly many (8+) and mostly a stable external fixture (API-response mock), `buildXxx(Partial<T>)` is allowed: meaningful name, defaults encapsulated inside. Weaker anti-pattern than a module const; for small functions still prefer explicit.

## 8. <a id="8-no-logic"></a>No logic in the test body

No `if`/`for`/computation inside an `it.each` callback or `expect`. Logic in the test **re-implements the system under test**, so both share the same bug and pass together. Expected values must be **hand-written literals**.

```ts
// ❌ expected computed the same way as the SUT
it.each(cases)('$name', ({ input }) => {
  const expected = input.pickupStock > 0 ? 'available' : 'outOfStock'; // duplicates SUT
  expect(computePickupState(input)).toBe(expected);
});

// ✅ expected is a literal; callback is one expect line
it.each([
  { input: { design: 'BLACK', pickupStock: 3, pickupEnabled: true }, expected: 'available' },
  { input: { design: 'BLACK', pickupStock: 0, pickupEnabled: true }, expected: 'outOfStock' },
])('$expected', ({ input, expected }) => {
  expect(computePickupState(input)).toBe(expected);
});
```

If you truly need branching/looping, that's a signal of many cases → spread into `it.each` rows.

## 9. <a id="9-checklist"></a>Checklist

- Name states input condition + output contract in domain language?
- A pure function returning a value? If not, can it be extracted into one?
- Time/random injected as parameters (pure, deterministic)?
- Output-based (asserts input→output)?
- Edge cases dense via input combinations?
- Happy + boundary + exception as one set? ([§2.1](#21-boundary))
- No internal export; only return values verified?
- Inputs written per-test, not a shared const? (`it.each` for boolean/enum matrices?)
- No `if`/`for`/computation in the body; expected values are literals?
- Verified without mocks? (mock needed → [integration](integration.md) candidate)
- A mutation that reverses the policy breaks the test? ([verification.md](verification.md))
