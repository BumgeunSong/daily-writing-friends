---
name: testing
description: Use when writing, adding, or modifying tests (*.test.ts, *.test.tsx, *.integration.test.tsx), adding coverage, implementing business logic, or doing TDD — unit tests for pure functions AND integration tests for components/hooks (React Query cache, MSW-mocked Supabase, React Router data-router loaders). Routes to strategy, naming, unit, integration, spec, and mutation-verification references. Does NOT cover cross-page journeys (use Playwright E2E in apps/web/tests/).
---

# Writing Tests

The single source of truth for test rules is `references/`. This skill routes there. Read the docs in order and write to their rules.

The goal is not coverage. **The goal is trust: after reading this test, can you trust the implementation more?**

## Read order

1. **[references/strategy.md](references/strategy.md)** — Define the risk you are blocking in one sentence, then place the code in the deep×wide quadrant to pick the level: unit / integration / don't-test / refactor-first.
2. **[references/spec.md](references/spec.md)** — For high-stakes features (payment, issuance, PII, feature-flag gates, or code with fix-commit history), confirm a domain answer-sheet (정답지) first. Ask the user once; skip for obvious pure-logic utils.
3. **Level doc** — Write with the rules of the level strategy picked:
   - **[references/unit.md](references/unit.md)** — pure functions, output-based, boundary+exception.
   - **[references/integration.md](references/integration.md)** — components/hooks/loaders, MSW + React Query + data-router, user-observable results.
4. **[references/verification.md](references/verification.md)** — If you added or changed an assertion, run the mutation loop to filter false-green. Skip for pure refactors (but record the skip).

Test names follow **[references/naming.md](references/naming.md)** at every level.

## File conventions

Tests are colocated with source (next to the file, or in a sibling `__tests__/`). Two Vitest projects, routed by filename:

| Kind | Extension | Vitest project | Setup | MSW |
|---|---|---|---|---|
| Unit | `*.test.ts(x)` | `unit` | `setupTest.ts` | off |
| Integration | `*.integration.test.tsx` | `integration` | `setupTest.ts` + `setupTest.integration.ts` | on (`onUnhandledRequest: 'error'`) |

**Missing the `.integration` suffix routes the file to the unit project with no MSW → silent false green.** This is the #1 filename mistake.

- Config: `apps/web/vite.config.ts` (`test.projects`). Run: `pnpm --filter web test` / `test:run` / `test:coverage`.
- E2E (Playwright, `apps/web/tests/*.spec.ts`, local Supabase) is out of scope for this skill.

## Stack facts (assume these; verify if surprised)

- React Query **v4**, React Router **v6** data-router (`createBrowserRouter`, loaders, lazy).
- Backend calls go to **Supabase REST** (`/rest/v1/*`, `/auth/v1/*`); tests mock the **network with MSW**, never the Supabase SDK.
- Render helper: `renderWithProviders` (`src/test/utils/renderWithProviders.tsx`). Auth: `signInAs` (`src/test/utils/signInAs.ts`) or `vi.mock('@/shared/hooks/useAuth')` — see integration.md.
- No Stryker; mutation verification is manual, using `vitest run <file> --coverage` (v8) for reachability.
