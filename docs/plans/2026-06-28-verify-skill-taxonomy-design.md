# Verify Skill Taxonomy — Design

**Date:** 2026-06-28
**Status:** Approved; implementation deferred to a later session
**Origin:** Brainstormed 2026-06-28

## Why

Today's verification skills carry tool names — `verify-runtime`, `verify-browser`. They answer "which tool?" But when `/verify` fires, the consumer holds a *change*, not a tool. They know what they changed; they do not yet know how to check it.

So organize verification knowledge by **change type**, and route each type to the tool that yields the cheapest sufficient evidence. The tool skills keep their tool names — they are tools. A change-type layer sits above them and routes.

## The taxonomy

Five live change types, plus a skip case:

| Change type | Tool | Skill |
|---|---|---|
| **Pure logic / transform** — pure function, mapper, formatter, derivation | Unit test, output-based. Cheap, deterministic, a permanent regression guard | `testing` |
| **Data access / API / mutation** — `*/api/`, Supabase query, React Query hook | MSW component/integration test for the contract. To confirm the real query, run against local Supabase and observe in the browser | `integration-testing` (+ `run-web` `dev:local`, `verify-browser`) |
| **Visual / layout / styling** — markup, Tailwind, spacing, responsive, dark mode | Playwright screenshot and layout assertions. jsdom sees no layout | `verify-browser` |
| **Interaction / navigation / routing** — click handlers, redirects, route config, forms | Playwright scripted for known assertions; agent-browser for ad-hoc exploration | `verify-browser`, `agent-browser` |
| **New feature / page / unknown behavior** — needs smoke and discovery | Exploratory dogfooding. It finds the bugs you did not think to assert | `dogfood` |
| **No runtime surface** — types, docs, config, dependency bump | Typecheck, or skip. Nothing runs | — |

## Decision: remove verify-runtime

`verify-runtime` checks data flow through structured dev logs. It existed for the Firebase-to-Supabase migration — dual-write and shadow-read compare events.

That migration finished. Evidence from the codebase (2026-06-28):

- `src` holds one `devLog` emitter — a perf-timing log in `usePostCard.ts`. No data-flow signal.
- No dual-write or shadow-read code remains.

The skill now describes events the app never emits. Remove it.

**Removal scope:**

- Delete `.claude/skills/verify-runtime/`.
- Separate cleanup, out of scope here: the dev-log Vite plugin, `scripts/devlog.ts`, the `devlog:*` package scripts, and the lone `usePostCard` emitter. Decide their fate when next touching that code. This plan removes the skill only.

## Open decisions (resolve next session)

1. **Structure** — one change-type dispatcher skill, or one thin `verifier-<type>` skill per row? Recommendation: a single dispatcher. It holds the table above and routes to the tool skills, which keep their names. Fewer skills to maintain, no overlap with the tool skills (YAGNI).
2. **Bundled `/verify` integration** — the bundled `/verify` discovers `verifier-*` skills by *surface* (CLI, server, GUI). This taxonomy routes by *change type*. For a single-surface web app, change type is the sharper axis. Decide whether the dispatcher complements `/verify` as a separate entry, or registers as a `verifier-*`.
3. **Naming** — keep `verify-browser`, or rename to `verifier-browser` so `/verify` auto-discovers it? Rename only if it earns the discovery.
4. **Tool split inside rows** — fold the agent-browser vs MSW vs local-Supabase choice into the data-access and interaction rows, or break it out.

## Implementation plan

1. Delete `.claude/skills/verify-runtime/`; update the memory index entry.
2. Resolve the four open decisions above.
3. Author the dispatcher (or the `verifier-*` set), encoding the taxonomy table.
4. Cross-link the tool skills (`testing`, `integration-testing`, `verify-browser`, `dogfood`, `agent-browser`, `run-web`) from the dispatcher.
5. Verify the dispatcher triggers on a sample change of each type.
6. Land as one PR.

## References

- Bundled `/verify`: runtime observation, surface-based, defers to `verifier-*` / `run-*` skills.
- `run-web` skill: this project's launch recipe (mise-pinned node, port 5173, local-Supabase variant) — shipped in PR #678.
- Tool skills: `testing`, `integration-testing`, `verify-browser`, `dogfood`, `agent-browser`.
