# E2E Tests (Playwright)

Add E2E thinly, **only after unit and integration are placed**, and only for behavior that jsdom + MSW cannot reproduce meaningfully. E2E has the highest regression defense and the highest cost.

> A test that never runs in CI blocks nothing. A spec that CI does not collect is the same as no spec.

## 0. File conventions

- **One folder: the repo-root `tests/`**, one config: root `playwright.config.ts`. Add new specs only there. Do not add to `apps/web/tests/` or `apps/web/playwright.config.ts` (legacy, being removed).
- Extension `*.spec.ts`. The Playwright API is `test.describe` / `test(...)` (no `it`).
- Local Supabase is the backend. Run from the **repo root**, naming the project: `pnpm exec playwright test --project=chromium-data-flows <file>`. A bare `playwright test` runs every spec on every engine.
- **What CI runs is defined by `.github/workflows/run-playwright.yml`**, not by the folder alone. Today CI runs only the `chromium-data-flows` and `chromium-non-member` projects. A spec outside `tests/data-flows/` shows up in plain `--list` but never runs in CI.
- **A guard keeps specs collected.** `node scripts/e2e/check-collection.mjs` (run in CI before the tests) fails when a spec file is collected by no CI project, and when the executed count differs from the collected count. Specs CI cannot run yet are listed in `tests/ci-uncollected.baseline.json` with a reason; that list only shrinks. `chromium-non-member` overrides the top-level `testIgnore` itself, so a project-level `testIgnore` replaces the top-level one instead of adding to it.
- Routing by name and folder:
  - `tests/data-flows/*.spec.ts` → `chromium-data-flows` (authenticated member).
  - `tests/data-flows/*.non-member.spec.ts` → `chromium-non-member`.
  - `*.logged-out.spec.ts` in root `tests/` → `chromium-no-auth` (not run in CI).
  - Other root specs, including `tests/e2e/`, → the engine projects (`chromium`, `firefox`, `webkit`, `Mobile Chrome`), not run in CI.
- Confirm a new spec is collected **by the CI projects**:
  `pnpm exec playwright test --list --project=chromium-data-flows --project=chromium-non-member | grep <file>`

## 1. Push down first

Ask:

> Can jsdom + MSW + Testing Library ([integration.md](integration.md)) reproduce this scenario meaningfully?

Yes → write it there. Only what a fake cannot reproduce goes up:

- **Real browser engine behavior**: contenteditable + IME composition, selection, undo history, input rules firing on real key events, focus/scroll/`position: sticky`, layout and overflow measured by bounding boxes.
- **Real Supabase boundary**: RLS and board-access gates, auth session/redirect, state that really lands in Postgres. (Image uploads go to Supabase Storage through `shared/external/imageStorage.ts`. Specs mock the request hermetically, as `avatar-resize.spec.ts` does. A mock aimed at a backend the app no longer calls fails silently as "nothing happened".)
- **Cross-page journeys**: login → board → write → publish → appears in the feed.
- **Browser/device differences that matter**: WebKit vs Blink input and scroll, mobile viewport (`Mobile Chrome`). CI installs chromium only, so such specs are not gated until a project and CI step for them exist.

Form validation, conditional rendering, button states and error branches belong to integration or unit.

> The criterion is not "I ran it in a browser" but "did it catch a failure only a real browser or a real backend can show?"

## 2. Few journeys: representative happy path and irreversible failures

- 1–2 happy paths per feature.
- Failures only when recovery is impossible or the gate is a security boundary (non-member cannot read a board, publish without permission).
- Recoverable, idempotent failures (validation, retry) are integration's job.

**An E2E count that keeps growing is the signal to push tests down.**

## 3. Assert user behavior, not implementation

- Locators: `getByRole`, `getByLabel`, `getByText` in that order. `data-testid` only when no accessible handle exists (and add the handle to the product code first if it should exist).
- No CSS-class or DOM-structure selectors, no `page.evaluate` poking app internals. Some existing specs and helpers still use `data-testid`, `waitForTimeout` or `evaluate`: new specs must not, and touched specs should migrate.
- **No fixed sleeps** (`waitForTimeout`). Wait on an observable condition: web-first assertions (`expect(locator).toBeVisible()`), `expect.poll`, `waitForResponse`.
- Name by what the user can do ([naming.md](naming.md)): `test.describe('글쓰기')` / `test('제목과 본문을 입력해 발행하면 피드에 글이 보인다')`. A name that starts with "click" or "text is shown" is too low-level.
- Repeated editor/page manipulation lives in a helper in `tests/helpers/` (see `editor-helpers.ts`, `ime-helper.ts`) named in user language, so a UI refactor touches one place.

## 4. Data: own it, isolate it

Shared mutable state is the biggest flake source.

- Each test **creates its own data** (post, comment, user) via API/fixture, not by clicking through UI.
- Tag created rows with a timestamp or UUID; look them up **by that identity**, never "the first item in the list".
- Clean up what the test created (`afterEach`/fixture teardown; see `tests/helpers/seed-cleanup.ts`), and also tolerate leftovers from a crashed run.
- Tests do not depend on order. A second run gives the same result.
- Never point E2E at production. Local Supabase only.

## 4.5 Pitfalls that already cost us failing specs

- **Assert the content, not the container.** Read the output panel with a web-first assertion or `toPass`, and require the text you typed. An assertion that accepts an empty paragraph passes vacuously while the real output is still debounced.
- **Do not type after undo when the test wants redo.** New input clears the redo history.
- **Keys differ by platform.** On macOS `End` scrolls instead of moving the caret, and `Meta+Shift+Z` does not reach the page as redo. Use `ArrowRight` and `Control`-based shortcuts (helpers: `modPress`, `modShiftPress`).
- **Fixtures must be what the app accepts.** The image pipeline refuses bytes it cannot decode, so a truncated JPEG never reaches the upload mock. Use a real PNG.
- **Specs outside the CI projects rot.** Before trusting an old spec, run it locally (`--retries=0`) and read the failure: classify it as a test problem or an app regression, and file an issue for the latter instead of hiding the spec.

## 5. Flaky is the enemy of trust

One flaky spec makes every pass suspect.

- Fix the root: data ownership (§4) and arbitrary sleeps (§3).
- Retries are for environment flake only. The config sets CI 1, local 0 (`retries` in `playwright.config.ts`): do not raise it. A test that passes only on retry is a signal, not a pass: record it.
- Check stability with `pnpm exec playwright test <file> --repeat-each=10`. Any failure → fix or delete, do not retry-mask.
- A repro-able flake is fixed or deleted, not left retrying. If it must be parked, use `test.fixme` with a reason so it stays visible.

## 6. Browsers: only where it differs

Do not run every spec on every browser. Default to one engine (chromium). Specs whose risk is an engine or viewport difference (IME, selection, sticky, touch) justify WebKit/Firefox/Mobile, but the current config runs every root spec on all four non-CI projects, and CI runs none of them. Narrow with `--project`.

## 7. Prove it blocks a bug

An E2E assertion is verified like any other: plant a mutation, see it fail. Procedure and classification: [verification.md](verification.md). E2E specifics:

- **Observed surface** = what the user sees in the browser or what lands in the DB.
- Run the mutated source through a real dev server (Vite HMR picks it up) against local Supabase. Confirm the server on the e2e port serves **this** worktree (`reuseExistingServer` silently reuses a stray one). Pass `--retries=0` so a pass cannot hide behind a retry.
- Reachability (condition 2) has no coverage tool here: confirm the mutation visibly changes behavior in the dev server, or that the spec's own steps exercise the mutated path.
- Revert every mutation, confirm the spec is green again and `git status` is clean.
- E2E is expensive: 2–3 distinct failure surfaces per spec, on the core guard only. (verification.md §3-E asks 3–5 for unit and integration; E2E is lower because every run costs a browser.)

## 8. Checklist

- Does it need a real browser engine, real Supabase, or a cross-page journey?
- Can integration not reproduce it meaningfully?
- Only representative happy paths and irreversible failures kept?
- Does `--list --project=<CI projects>` show the spec (does CI actually run it)?
- Role/label locators, no sleeps, no order dependence?
- Own data, own cleanup, second run identical?
- Survives `--repeat-each=10`?
- Mutation-verified, with the result (planted mutation, prediction, outcome, classification) recorded in the PR body? The repo has no commit trailer for it.
