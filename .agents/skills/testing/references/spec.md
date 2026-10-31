# Spec Answer-Sheet (정답지)

Before testing a **high-stakes** feature, confirm what it must guarantee, in domain language, in one document — the answer-sheet. The answer-sheet is not the test; it's the basis the test translates from, and the standard the code is measured against.

## Why

What to test lives outside the code. Code shows what it does, not what it should do. Testing from code alone bakes two failures in: policies not expressed in code (a suspended/expired third tier) never enter the tests, and existing bugs get carved in as the expected answer.

So don't ask a human to write a spec from a blank page. Draft it first — read the code and fix-commits to fill in the rules, mark the uncertain spots, and show it all at once. The human edits instead of composing. Human decides; agent drafts and translates.

## When — the one-question rule

When you start writing tests, look for an answer-sheet at `apps/web/spec/<feature>.md` (domain-named, e.g. `spec/발행-접근제어.md`).

- **Exists** → read and use it. If a rule contradicts the code/reality, don't follow it blindly — mark only that spot `❓` and re-confirm.
- **Missing** → ask the user **once**, with a recommendation:
  - **Interview recommended** when a gate that's an incident if violated is visible (payment, issuance, PII, feature-flag), the code has fix-commit history, or a service-specific policy that can't be inferred from common sense is at play.
  - **Proceed from code recommended** for common-domain pure utils (formatters, mappers).
- If the user skips, don't ask again in the same task. But **skipping the question silently is itself a violation** — the question is the rule. Don't decide "it's obvious" on the user's behalf; express "obvious" as the recommended option and let them choose.
- If the user says "spec first", start the interview with no question.

## Interview (slimmed)

1. **Scope** — confirm the target with the user (a file/folder they point at, or narrow numbered candidates for a vague ask). Narrow beats broad: a tight scope makes a dense draft, and the "what I might have missed" section pulls in adjacent rules.
2. **Gather policy traces** — read the target code for branches, tiers, violation handling. Read the fix-commit history of the file and its feature folder — a fixed bug is evidence a rule lived there. Don't trawl Slack/design docs unprompted; ask the user for links/keywords and follow only those. Code tells you a branch exists, not whether violating it is "just not allowed" vs "an incident" — read that from fix-commits or confirm with the human.
3. **Draft it fully** — write every rule found, with scenario and expectation. While drafting:
   - **Mark confidence.** Rules settled by code/fix-commits → write them plainly. Judgment calls (live rule vs dead code, incident vs not) → mark `❓` with a one-line question. A single missing value (a limit amount, a copy string) → mark `✏️` and leave a blank (`____`) — don't guess the value.
   - **Read severity from evidence.** Fix-commit-blocked behavior, or branches touching payment/issuance/PII/feature-flag gates, signal "incident if violated" → draft the expectation as imperative and just confirm with `❓`. No signal → declarative; don't inflate.
   - **Sweep for gaps.** Read once more for what the code silently doesn't handle: error paths, empty/initial state, out-of-bounds input.
   - **Open a blind spot.** End with a "what I might have missed" section: state what code you read, what inputs you assumed, what you ruled out of scope, and ask specific numbered questions. Don't ask "anything missing?" — blanks get blank answers.
4. **One review pass** — save the draft to `apps/web/spec/<feature>.md`, open it. `✅` unchanged = approved; the human answers `❓`/`✏️` inline. Put a "read only here" line at the top with the `❓`/`✏️` counts. Reflect answers; draft any "missed" items into rules; re-confirm only newly uncertain spots. Don't manufacture another round-trip.
5. **Close and finalize** — before finalizing, ensure no unanswered `❓`/`✏️`/blank remains; if any do, present them again rather than silently deleting (deleting an unanswered spot to freeze it as truth is exactly what this guards against). Deliberately-open spots are recorded as a one-line "미정". Then strip all review markers, leaving rules + scenarios.

## Answer-sheet format

Rules `##`, scenarios `###`, situation/action/expectation as bullets. No colons in titles/labels. Domain language only — a PM/designer must understand it; no component/route/API-code terms, no click-by-click steps ("유효한 정보로 로그인한다", not "이메일 필드에 입력하고 제출을 누른다"). One action per scenario. Endings carry severity (declarative default; imperative only for incident-grade). Expectations are observable results (no conversion rates / response times). Don't draw enforcement from values only the server/provider knows.

```markdown
## 규칙 — 거절 유저는 사용 불가 안내를 본다

### 거절 유저가 차단 화면에 들어온다
- **상황** 심사에서 거절된 유저다
- **행동** 충전을 시도한다
- **기대**
  - 사용 불가 안내가 뜬다
```

## From answer-sheet to tests

Once confirmed, testing is translation, not invention:

| Answer-sheet | Test |
|---|---|
| a rule | the one-sentence risk, the test-name skeleton |
| scenario situation | `describe` (the user's context) |
| scenario action + expectation | `it` (one action, observable result) |
| declarative expectation | declarative `it` name |
| imperative expectation | imperative `it` name (bug-blocking) |
| one expectation bullet | one independently-checked assertion |

The answer-sheet doesn't fix the level — [strategy.md](strategy.md) does; the same rule may be checked by unit (policy function) and integration (wiring) from different angles. In [verification.md](verification.md), the rule list is the mutation target.

## The line this guards

Deciding what's an incident, and what the code missed, is the human's job. Filling the draft and translating to test-endings is the agent's. A wrong draft is cheap for the human to fix. What must be prevented is skipping human confirmation and carving the draft in as truth.
