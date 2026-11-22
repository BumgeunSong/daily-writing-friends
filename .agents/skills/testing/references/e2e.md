# E2E Tests (Playwright)

Add E2E thinly, **only after unit and integration are placed**, and only for behavior that jsdom + MSW cannot reproduce meaningfully. E2E has the highest regression defense and the highest cost.

> A test that never runs in CI blocks nothing. A spec that CI does not collect is the same as no spec.

## 0. File conventions

- **One folder: the repo-root `tests/`.** `apps/web/tests/` must not exist. Config: root `playwright.config.ts`.
- Extension `*.spec.ts`. Auth variants route by filename: `*.logged-out.spec.ts`, `*.non-member.spec.ts` (see config `projects`).
- Local Supabase is the backend. Run from the **repo root** (not `apps/web`): `pnpm exec playwright test`.
- After adding a spec, confirm the runner collects it: `pnpm exec playwright test --list | grep <file>`. An uncollected spec never fails, it never runs.

## 1. Push down first

Ask:

> Can jsdom + MSW + Testing Library ([integration.md](integration.md)) reproduce this scenario meaningfully?

Yes → write it there. Only what a fake cannot reproduce goes up:

- **Real browser engine behavior**: contenteditable + IME composition, selection, undo history, input rules firing on real key events, focus/scroll/`position: sticky`, layout and overflow measured by bounding boxes.
- **Real Supabase boundary**: RLS and board-access gates, auth session/redirect, storage upload round-trip, state that really lands in Postgres.
- **Cross-page journeys**: login → board → write → publish → appears in the feed.
- **Browser/device differences that matter**: WebKit vs Blink input and scroll, mobile viewport (`Mobile Chrome`).

Form validation, conditional rendering, button states and error branches belong to integration or unit.

> The criterion is not "I ran it in a browser" but "did it catch a failure only a real browser or a real backend can show?"

## 2. Few journeys: representative happy path and irreversible failures

- 1–2 happy paths per feature.
- Failures only when recovery is impossible or the gate is a security boundary (non-member cannot read a board, publish without permission).
- Recoverable, idempotent failures (validation, retry) are integration's job.

**An E2E count that keeps growing is the signal to push tests down.**

## 3. Assert user behavior, not implementation

- Locators: `getByRole`, `getByLabel`, `getByText` in that order. `data-testid` only when no accessible handle exists (and add the handle to the product code first if it should exist).
- No CSS-class or DOM-structure selectors, no `page.evaluate` poking app internals.
- **No fixed sleeps** (`waitForTimeout`). Wait on an observable condition: web-first assertions (`expect(locator).toBeVisible()`), `expect.poll`, `waitForResponse`.
- Name by what the user can do ([naming.md](naming.md)): `describe('글쓰기')` / `it('제목과 본문을 입력해 발행하면 피드에 글이 보인다')`. A name that starts with "click" or "text is shown" is too low-level.
- Repeated editor/page manipulation lives in a helper (`tests/helpers/`) named in user language (`typeInEditor`, `selectText`), so a UI refactor touches one place.

## 4. Data: own it, isolate it

Shared mutable state is the biggest flake source.

- Each test **creates its own data** (post, comment, user) via API/fixture, not by clicking through UI.
- Tag created rows with a timestamp or UUID; look them up **by that identity**, never "the first item in the list".
- Clean up what the test created (afterEach/fixture teardown), and also tolerate leftovers from a crashed run.
- Tests do not depend on order. A second run gives the same result.
- Never point E2E at production. Local Supabase only.

## 5. Flaky is the enemy of trust

One flaky spec makes every pass suspect.

- Fix the root: data ownership (§4) and arbitrary sleeps (§3).
- Retries are for environment flake only: **CI ≤ 1–2, local 0** (config `retries`). A test that passes only on retry is a signal, not a pass: record it.
- Check stability with `pnpm exec playwright test <file> --repeat-each=10`. Any failure → fix or delete, do not retry-mask.
- Repro-able flake: quarantine from the gate but keep running and logging; fix or delete within two weeks.

## 6. Browsers: only where it differs

Do not run every spec on every browser. Default to one engine (chromium). Add WebKit/Firefox/Mobile only for specs whose risk is an engine or viewport difference (IME, selection, sticky, touch).

## 7. Prove it blocks a bug

An E2E assertion is verified like any other: plant a mutation, see it fail. Procedure and classification: [verification.md](verification.md). E2E specifics:

- **Observed surface** = what the user sees in the browser or what lands in the DB.
- Run the mutated source through a real dev server (Vite HMR picks it up) against local Supabase. Use `--repeat-each` or `--retries=0` so a pass cannot hide behind a retry.
- Revert every mutation, confirm the spec is green again and `git status` is clean.
- E2E is expensive: 2–3 distinct failure surfaces per spec, on the core guard only.

## 8. Checklist

- Does it need a real browser engine, real Supabase, or a cross-page journey?
- Can integration not reproduce it meaningfully?
- Only representative happy paths and irreversible failures kept?
- Is the spec collected by the CI project (`playwright test --list`)?
- Role/label locators, no sleeps, no order dependence?
- Own data, own cleanup, second run identical?
- Survives `--repeat-each=10`?
- Mutation-verified, with the result recorded?
