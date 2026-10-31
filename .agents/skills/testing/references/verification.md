# Mutation Verification

After you write or change an assertion (`expect`), verify the test **actually blocks a bug** by mutation — deliberately breaking the source and checking the test goes red. This filters false green (a test that passes but guards nothing) before commit. Applies to unit and integration alike.

There is no Stryker here; this is a **manual** loop. Reachability is checked with `vitest run <file> --coverage` (v8 branch coverage).

> The one question everything reduces to: **does this test block a bug that reaches the user or operations?**

## 0. Is this step needed?

Do it when you added/changed an assertion or case — a new guarantee exists, so confirm it's real. Skip for pure refactors that didn't touch an assertion (rename/format/move), but still record the skip ([§4](#4-finish)).

## 1. Pick a good mutation

A good mutation genuinely tests the guard's protection. All five conditions must hold; break one and running it yields no information.

| Condition | If broken |
|---|---|
| **1. Causes a real bug** | a change that hurts nobody in prod — killing/surviving tells you nothing |
| **2. Reachable in this fixture** | the spot never executes — surviving isn't the test's fault |
| **3. Changes the observed surface** | code breaks but this level can't see it — the test has no way to catch it |
| **4. Different failure surface than the last** | hits the same assertion again — no new info after the first |
| **5. Compiles** | the experiment doesn't run — a type error isn't a bug |

**Observed surface** = what the level can see. Unit → the return value. Integration → the screen/flow/side effect the user observes (a "next step" callback counts).

> **AI-mutation trap.** Model-generated mutations are close to real bugs (good at exposing weak tests) but often break conditions 2/3/4/5 — especially dead branches. Vitest doesn't type-check, so an unreachable mutation runs anyway and gets logged as "survived", easily misread as a weak test.

### How to satisfy the conditions

1. **Start from a bug, not a line** — "if this policy breaks, what bug appears?", not "flip this if". Common bug shapes: remove/invert a policy condition, misread an API field, reference a different state than the selected one, boundary shift (`>` ↔ `>=`), drop an alias-group member, treat a failure response as success, show the notice but also proceed.
2. **Write the test's promise in one line** — unit: input → output contract; integration: user scenario → observed result. This line decides "inside or outside this test's promise" in [§3](#3-classify).
3. **Split distinct failure surfaces** (condition 4). Don't hit the same assertion repeatedly. Unit: different policy clauses in one function (gate condition, boundary, alias group, gate isolation). Integration: the layer chain the policy passes (API parse → state calc → policy → wiring → UI branch → actual block). For a shared helper: helper mutation asks "is the policy itself right"; callsite mutation asks "does each path actually call it" — unit pokes the helper only (surviving callsite → "another test owns it"); integration pokes both. **The first candidate is usually guard-disabling** (make the block condition not run) — the most common real-bug shape.
4. **Screen before planting** (conditions 2, 5). Reachability is verifiable: look at **branch coverage** (line coverage is not enough — a condition line runs every time while the mutated arm never opens).
   ```bash
   pnpm --filter web test:run <path/to/file> -- --coverage
   ```
   The rest you self-check: compiles? failure surface overlaps the previous? does the observed surface actually change (condition 3 — tools can't catch this; [§3](#3-classify) decides it)?

## 2. Run: predict before you look

The point isn't the planting procedure — it's **writing the prediction before seeing the result.** Without a prediction, any outcome seems reasonable and the verdict becomes post-hoc rationalization.

Per mutation:
1. write the bug you're blocking and the test's promise
2. apply one small change, one at a time
3. predict on two axes: **what** changes (observed surface), **which** test fails how
4. run; compare actual failure to the prediction
5. classify ([§3](#3-classify))
6. immediately revert the mutation diff; confirm the original test is green again
7. confirm the working tree is clean (format/import diffs are residue too)

Failure **scope** is a signal too: a single-surface mutant that kills every test → assertions are entangled; a helper mutant that kills less than expected → some path doesn't run that policy. Mutation is an **experiment**, not a code change.

## 3. <a id="3-classify"></a>Classify and respond

```text
mutation result
├─ killed → confirm the failure message reads in policy language; if not, sharpen the assertion (§3-C)
└─ survived
   ├─ never executed = NoCoverage → no info; discard, plant elsewhere (§1.4)
   └─ executed
      ├─ same result for all inputs = equivalent → nothing (beware "same only in this fixture" → treat as "nobody guards")
      └─ result differs by input = real bug
         ├─ outside this test's promise
         │  ├─ another test guards it → nothing
         │  └─ nobody guards it → `it.todo` with the future test's promise (§3-D)
         └─ inside this test's promise
            ├─ no assertion for it → add the assertion now (§3-C)
            └─ hidden by mock data → make the mock closer to reality now
```

Responses get heavier downward. The bottom two must be fixed **before commit**.

**equivalent** is the hardest, most-often-wrong verdict — real equivalence means every input gives the same result; usually it's just "same in this fixture", which is missing cases, not equivalence. When unsure, record it as **"nobody guards"** — a missed bug is safer than believing an unguarded thing is guarded.

**hidden by mock data** is the only leaf meaning **the test structure itself is wrong** — usually over-mocking; check you didn't fake code you own ([integration.md §4](integration.md#4-mock)).

### 3-C. Sharpen the failure message

Killing isn't enough — the message alone must explain which bug occurred (a colleague reads only the CI log later).

```text
✅ FAIL ... > WHITE는 픽업 재고가 있어도 blockedByPolicy다
   expected 'available' to be 'blockedByPolicy'
❌ Unable to find element / expected false to be true / Cannot read properties of undefined
```

A bad message is a signal to fix the test, not an observation to log. Unit: policy language lives in the **test name** — spread piled cases into `it.each` rows so the failing row name is the policy message. Integration: replace an anchor assertion that masks the policy with an always-rendered element; carry a policy message in the assertion (`expect(value, '교통 배너 클릭은 영구 저장돼야 한다')`) when a primitive compare yields "expected false to be true".

### 3-D. `it.todo` for unguarded bugs

Record a "nobody guards" miss as `it.todo` with the **future test's promise** (§1.2 form), not the discovery story.

```ts
// ❌ it.todo('상태 계산 mutation이 살아남음');
// ✅ it.todo('픽업 재고가 없는 디자인은 선택 화면에 노출되지 않는다');
```

If you can't write the one-line promise, it's "another test guards it", not "nobody guards". Writing the todo doubles as the classification check.

### 3-E. When to stop

Verify 3–5 **distinct** failure surfaces for one policy, then move to the next core policy. The number isn't the goal — "distinct" is. Hitting the same assertion five times counts as one.

## 4. <a id="4-finish"></a>Finish

Mutation leaves no trace in code; record only that you ran it. Before commit, confirm:
- no mutation diff remains; the original test is green again
- related unit/integration tests pass as intended

> The final question of a good test: **does this test give real grounds to trust the (AI-written) implementation?** The good output is not a kill count but: which bug it blocks, which failure surfaces it caught, which mutations survived and why, and therefore how far to trust it.
