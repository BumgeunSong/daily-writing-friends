# Test Strategy

Before writing a test, **define the risk you are blocking** and **classify the code in the deep×wide quadrant**. That classification decides unit / integration / "don't test" / "refactor first".

## Core question

> After reading this test, can you trust the (often AI-written) implementation more?

Coverage is not the goal. Trust is.

## 1. Start from risk, not code

- If this code is wrong, what bug reaches the user or operations?
- Is the bug important enough to block before merge?
- If this test fails, will a reviewer immediately understand the risk?

**The risk must be stateable in one sentence.**

```text
WHITE/AURORA 카드 사용자가 편의점 픽업 발급 단계로 진입해,
실제 매장에 없는 카드 예약/결제로 이어진다.
```

If the risk won't fit in one sentence — or it does but the basis is a domain policy outside the code (guessing) — build the answer-sheet first via [spec.md](spec.md). With an answer-sheet, each rule IS the risk sentence.

## 2. The code quadrant

Two axes:

- **Decision depth (deep)**: policy conditions, price/fee/stock calculation, feature-flag interpretation, error-code mapping, funnel-step decisions, domain rules.
- **Collaborator count (wide)**: API, query/mutation hooks, overlays, navigation, logging, feature flags, parent callbacks, child components.

> **No deep + wide.** If it's both, split before testing.

| Quadrant | Code type | Prescription |
|---|---|---|
| 1 — deep, narrow | domain rules, pure calculation, algorithms | **Unit test** ([unit.md](unit.md)) |
| 2 — shallow, narrow | thin wrappers, redirects, static rendering | **Don't test** (or verify indirectly from above) |
| 3 — shallow, wide | containers, controllers, wiring | **Integration test** ([integration.md](integration.md)) |
| 4 — deep, wide | over-complicated code | **Refactor first** (decompose into 1 + 3) |

## 3. Quadrant 1 — Unit

- Pure functions that make a policy decision input → output.
- Examples: policy models, `computeX` calculators, formatters, mappers, reducers, selectors.
- Verify: dense edge cases via input combinations.
- Avoid: container mount, API mock, rendering.

## 4. Quadrant 2 — Don't test

- Almost no branches/props/return.
- Example: a component that only `useEffect`s once and navigates.
- Verify: indirectly from an integration test above ("from this state, where does it transition") — nothing more.
- Avoid: hook-mock call counts, navigate mocks, snapshots.

## 5. Quadrant 3 — Integration

- Code wiring query/model/container/component/callback together.
- Verify: user action → observable UI result + boundary effects (callback/navigation/overlay).
- Avoid: full app mount, internal-state assertions, re-verifying model logic.

## 6. Quadrant 4 — Refactor first

Separate decision from wiring before testing:

```text
complex decision  → pure function / domain model   (quadrant 1, unit)
external wiring    → thin container / controller     (quadrant 3, integration)
presentation       → presentation component          (quadrant 2)
```

Do not add a giant integration test or mock-heavy test to a deep+wide file. See the [refactoring](../../refactoring/SKILL.md) skill for the functional-core / imperative-shell extraction.

## 7. Pre-write classification questions

1. Does this code make an important decision?
2. If that decision is wrong, does a bug reach the user/operations?
3. Are there many external collaborators?
4. Is it deep, wide, or both?
5. Is unit faster and more accurate here?
6. Do I need integration to verify connections between pieces?
7. Is there effectively no decision, so I don't test it?
8. Is it deep + wide, so I refactor first?

## 8. Division of labor

| Level | Responsibility |
|---|---|
| Unit | policy truth, calculation correctness, domain decisions, edge cases |
| Integration | whether the policy connects to user action; query→model→container→UI→callback wiring |

Integration does not try to catch every quadrant-1 policy mutation — unit owns quadrant 1, wiring owns quadrant 3.

> Deep decisions → pure functions verified by unit. Many collaborators → integration. Both → refactor. No decision → the deliberate choice not to test.
