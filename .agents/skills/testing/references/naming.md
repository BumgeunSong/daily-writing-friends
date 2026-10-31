# Test Naming

Applies at every level (unit / integration). Level-specific examples live in each level doc.

**The name has one job: from the name alone, you know which risk or policy broke.** Reveal the risk at the right level of detail — unit reveals input condition → output contract, integration reveals the user's situation → observable result.

```ts
// ✅ reveals the policy
it('BLACK이 아닌 디자인은 픽업 재고가 있어도 픽업 플로우에 진입하면 안 된다', ...)

// ❌ describes the mechanism, hides the policy
it('픽업 바텀시트를 렌더링한다', ...)
it('핸들러를 올바르게 호출한다', ...)
```

## Write names in Korean

Test **names** (`describe`/`it` strings) are Korean policy sentences, so the broken policy is legible at a glance. Code identifiers, enum values, and `expect` arguments stay in their source form (English). Existing English-named tests stay as-is; this rule governs new tests.

## Use `it`, not `test`

`describe('상황') > it('결과')` BDD structure fits Korean sentence endings. Never mix `test`/`it` in one file.

## `describe` is context, not a function name

Set `describe` to the context the test describes, not the function/implementation category. Unit → the domain context where a pure decision applies; integration → the situation the user is in.

```ts
// ✅
describe('홈 배너 목적지를 정할 때', () => { ... });
describe('제한 없는 유저(WLF NORMAL)', () => { ... });

// ❌ function name / implementation category
describe('toHomeModel', () => { ... });
describe('invalidateQueries', () => { ... });
```

When sibling functions share the same input, use `describe` to split by the entry context that makes them differ — deleting the function name would otherwise erase the only thing distinguishing them.

```ts
describe('카드 브릿지 URL로 진입한 유저', () => { ... });
describe('홈 교통카드 섹션에서 진입한 유저', () => { ... });
```

## `it` ending: declarative by default, imperative for bug-blocking

- **Default (declarative)** — `~한다` / `~지 않는다`. States the guaranteed result as fact. Short and natural.
- **Bug-blocking (imperative)** — `~해야 한다` / `~하면 안 된다`. Reserve for policies that directly block a user-facing bug: payment, issuance, PII exposure, feature-flag violations. If every name is imperative, the severity signal disappears.

```ts
it('활성화 카드를 보유하면 티머니 충전 안내 배너를 본다', ...)          // declarative
it('BLACK이 아닌 카드는 픽업 재고가 있어도 픽업 플로우에 진입하면 안 된다', ...) // imperative
```

## Translate enums/status to domain vocabulary

For a name to reveal a bug, don't expose raw internal identifiers.

- **enum / flag / status values** (`ACTIVATED`, `NORMAL`) — write as domain language in the name; keep the enum as-is inside setup/`expect`.

  | enum | user vocabulary |
  |---|---|
  | `ACTIVATED` | 활성화된 카드 |
  | `DEACTIVATED` | 만료된 카드 |
  | `wlfStatus: 'NORMAL'` | 제한 없는 유저 |

- **domain abbreviations** (`AML`, `KYC`) — expand once in `describe` with the abbreviation in parentheses; use the abbreviation in `it`.
- **internal tool / brand / raw flag keys** — translate to the user feature they toggle. `feature flag` as a general concept is allowed; a specific tool brand name is mechanism leakage and banned.

```ts
// ❌ enum hides the bug
it('현재 카드가 ACTIVATED 상태라면 티머니 충전 안내 배너를 받아야 한다', ...)

// ✅
describe('제한 없는 유저(WLF NORMAL)', () => {
  it('활성화 카드를 보유하면 티머니 충전 안내 배너를 본다', ...)
});
```

## Matrix tests: report name is a domain sentence

For `it.each`, keep the table's input/expected as exact code contracts, but the reported test name is a human-readable domain sentence (see unit.md §output-union).

## Self-check

If the name doesn't reveal the bug in one second, usually the enum wasn't translated to user vocabulary, or `describe` is tied to a function name/category. A raw tool/flag key in the name signals a missing domain translation. Distinguishing sibling functions only by function name signals a missing entry context in `describe`.
