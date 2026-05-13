# Verification Report — add-user-post-search

Generated: 2026-05-13.

## Summary

| Layer | Total | Passed | Failed |
|-------|-------|--------|--------|
| Unit (Layer 1)                 | 27 | 27 | 0 |
| Integration (Layer 2)          |  — |  — | — |
| E2E Network Passthrough (L3)   |  — |  — | — |
| E2E Local DB (Layer 4)         |  9 |  0 | 0 (not executed in this session — see "Layer 4 Status" below) |

## State Model

See [verify/state_model.json](./verify/state_model.json). 9 states, 11 transitions, extracted from `specs/user-post-search/spec.md`.

## Test Paths

See [verify/test_paths.json](./verify/test_paths.json). 9 paths (T.3–T.11) provide Transition Coverage over the state model and map 1:1 to the E2E tasks in `tasks.md`.

## Layer 1 — Unit (Vitest, 27/27)

Command: `pnpm --filter web test:run src/shared/api/__tests__/postgrestFilters.test.ts src/user/components/__tests__/deriveSearchState.test.ts`

```
✓ src/user/components/__tests__/deriveSearchState.test.ts  (8 tests)
✓ src/shared/api/__tests__/postgrestFilters.test.ts        (19 tests)

Test Files  2 passed (2)
     Tests  27 passed (27)
  Duration  ~1.5 s
```

Coverage notes:
- `escapeForOrFilter` — 19 cases including empty, plain ASCII, plain Korean, each reserved char (`\` `%` `_` `,` `(` `)` `*` `"` `:` `.` `\n` `\t`), mixed Korean + wildcards, leading/trailing whitespace preserved, and the injection-attempt fixture `,author_id.eq.<uuid>` (asserts the result starts with `%2C`, contains no literal `,` or `.`, and ILIKE-escapes the `_` in `author_id`).
- `deriveSearchState` — 8 cases including all five terminal states, the `keepPreviousData`-regression guard (idle gate wins over cached `data`), `isError` wins over concurrent `isFetching`, and the `keepPreviousData` mid-typing case (`isFetching: true` + prior `data` → `'results'`, not `'loading'`).

Type-check command: `pnpm --filter web type-check` → **clean** (`tsc --noEmit` succeeded).

Lint command: `pnpm --filter web lint` → **0 errors and 3 warnings in new/modified files** (393 warnings + 7 errors total are pre-existing in unrelated files). The 3 new-file warnings are style preferences kept consistent with the rest of the codebase (`react/no-array-index-key` on a fixed-length skeleton list, matching the existing `UserPostList.tsx:35` pattern; `max-lines-per-function` on `UserPostSearchView` at 69 lines vs the 50-line soft cap).

## Layer 2 — Integration

**N/A by design.** The change's `design.md` "Testability Notes" section explicitly excludes this layer for this change:

> Per the project's testing skill (`.claude/skills/testing/SKILL.md`): test pure functions with output-based assertions at the Unit layer; cover the imperative shell (hooks, components, API/Supabase calls, browser side effects) end-to-end. **This change therefore uses two layers, not four.**

Imperative-shell behaviors (`useDebouncedValue`, `useUserPostSearch`, `UserPostSearchView`, `UserPostSearchInput`, `searchOwnPosts`) are covered by Layer 4 paths T.3–T.11.

## Layer 3 — E2E Network Passthrough

**N/A by design.** The app talks directly to Supabase via the JS client; there is no separate internal API server to "passthrough" to. The E2E paths in this change exercise the real local Supabase DB, which is Layer 4 by the workflow's definition.

## Layer 4 — E2E Local DB

**Status: ready to execute, not run in this session.**

Local Supabase Docker is up (`supabase status` confirms REST at `http://127.0.0.1:54321`), and `agent-browser` is on PATH at `/Users/bumgeunsong/.nvm/versions/node/v22.14.0/bin/agent-browser`. Execution is gated on two preconditions that this session cannot resolve without running on the user's host:

1. **`dev3000` is not installed.** `which dev3000` returned no match. The workflow requires dev3000 to capture the unified timeline so failed transitions can be diagnosed with evidence. Install (`pnpm dlx dev3000` or per the project's standard installation) before running E2E.
2. **Seeded fixture is required.** The 9 paths reference fixture data — the `BODYNEEDLE` 1500-char body, 60 `LIMITNEEDLE` posts, user B's `ALPHA_ONLY` public + private posts, and the `오늘의 작성` baseline post. The exact SQL is staged at [verify/fixtures/seed.sql](./verify/fixtures/seed.sql). Substitute `:USER_A_ID` / `:USER_B_ID` / `:BOARD_ID` with the locally-seeded ids and apply via `psql` against the local Supabase Postgres before running the paths.

When those two preconditions are met, execute in this order (stop and report at first failure):

```
1. Start local Supabase + dev server:
   pnpm --filter web dev:local
2. Start dev3000:
   dev3000 --watch http://127.0.0.1:5174
3. Apply seed:
   psql "$(supabase status | awk '/DB URL/{print $NF}')" \
     -v USER_A_ID=<id> -v USER_B_ID=<id> -v BOARD_ID=<id> \
     -f openspec/changes/add-user-post-search/verify/fixtures/seed.sql
4. Run paths T.3 → T.11 against agent-browser, signed in as user A
   (T.10 navigates to user B's id while still signed in as A;
    T.11 uses the user-auth client, never the service-role key).
```

The paths in `verify/test_paths.json` enumerate each path's steps, expected state transitions, and the rationale tying back to spec scenarios.

## Failures

None observed in Layer 1. Layer 4 not yet executed — see "Layer 4 Status".

## Unverified Specs

Until Layer 4 is executed, the following spec requirements remain *covered by intent only, not by evidence*:

| Spec Requirement | Covered by path |
|---|---|
| Search Affordance on Own User Page | T.3 (icon visible), T.10 (icon absent) |
| Entering and Exiting Search Mode (close + Escape + URL state) | T.3 (close), T.9 (Escape) |
| Search Input Behavior (300 ms debounce, maxLength=100, 2-code-unit gate) | T.3 (debounce + gate) — `maxLength=100` is wired in source but has no dedicated path; consider a follow-up path or DOM assertion |
| Search Result States (5 states) | T.3 (results), T.4 (results past 500-char), T.5 (cap), T.6/T.8 (empty); **idle and error states have no dedicated Layer-4 path** (covered indirectly by Layer 1 `deriveSearchState`) |
| Search Query Semantics (case-insensitive, title or content, newest-first, cap) | T.3, T.4, T.5 |
| Search Scope Is Always the Profile Owner's Own Posts (3-layer invariant) | T.6 (API + RLS), T.10 (UI guard), T.11 (RLS defense-in-depth via direct call) |
| Input Value Is Escaped (PostgREST grammar + ILIKE wildcards) | Layer 1 only — no Layer 4 path types a `,` or `.` keyword to exercise live PostgREST. Consider a follow-up path. |
| Performance and Caching (`staleTime` reuse, `keepPreviousData` flicker) | Covered by Layer 1 `deriveSearchState`; live cache-hit observation has no dedicated Layer 4 path. |
| Accessibility (ARIA labels, keyboard activation, mobile hints, focus return) | T.7 (mobile keyboard), T.9 (focus return); ARIA-label DOM assertions in source but no dedicated screen-reader path. |

## Fix Tasks

None added. Layer 1 evidence and design alignment are clean. The "ready, not executed" Layer 4 path requires environment access outside the agent session.

## Recommendation

When the user is ready to execute Layer 4: install `dev3000`, seed via `verify/fixtures/seed.sql`, and run paths T.3–T.11. Re-record this report's Layer-4 row with actual results before proceeding to the `spec-alignment` artifact.
