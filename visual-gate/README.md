# Visual regression gate (MVP)

A lightweight, offline visual-regression gate for `apps/web` components. It renders a
component in a standalone harness across four viewport/theme environments, captures a
layout snapshot, and reports two kinds of signal:

- **A-layer** — absolute layout invariants that need no baseline (horizontal overflow,
  interactive element off-viewport, fixed-element overlap, clipped text). Works on
  brand-new UI.
- **B-layer** — a before/after geometry diff for one change. Captures a DOM *tree* of
  relational metrics and reconciles it framework-neutrally (`matcher.mjs`): per parent,
  sibling lists are paired by unique keys (exact-subtree → contract key → own text →
  structural shape) after exactHash end-trimming, so an inserted sibling never shifts the
  rest. Reorders fold into `moved` (LIS), indistinguishable twins report `ambiguous`
  rather than guess, and a capture that fails the convergence loop is "cannot judge",
  not a regression.

The whole loop runs in a few seconds with **zero tracked-file changes** and no backend:
the only override vs the real app is swapping the single Supabase client factory for an
auth-only offline fake (`apps/web/src/shared/external/__fixtures__/supabaseClient.ts`),
aliased in `apps/web/visual-gate/vite.gate.config.ts`.

## Run

```bash
# 1. start the harness dev server (separate vite config, port 5199)
pnpm --dir apps/web exec vite --config visual-gate/vite.gate.config.ts

# 2. capture A-layer + a snapshot for one label (repeat with a change applied)
node visual-gate/gate.mjs --label before --url "http://localhost:5199/visual-gate/index.html?component=mentionable"
node visual-gate/gate.mjs --label after  --url "http://localhost:5199/visual-gate/index.html?component=mentionable"

# 3. B-layer diff per environment (E0=390 light, E1=390 dark, E2=320 light, E4=1280 light)
for e in E0 E1 E2 E4; do node visual-gate/diff.mjs $e; done
```

`?component=` selects what the harness mounts (`commentInput` | `mentionable` | `replyInput`).
Snapshots (PNG + JSON) land in `visual-gate/reports/`, which is gitignored — regenerate them,
don't commit them.

## Files

- `gate.mjs` — Playwright capture + A-layer invariants (runs on every env, no baseline).
- `matcher.mjs` — framework-neutral tree reconciliation (pure; unit-tested in `matcher.test.mjs`).
- `diff.mjs` — B-layer before/after tree diff; hashes both captures and calls the matcher.
- `apps/web/visual-gate/` — the dev-only harness (`index.html`, `main.tsx`, `Harness.tsx`) and
  its standalone `vite.gate.config.ts`.
- `apps/web/src/shared/external/__fixtures__/supabaseClient.ts` — auth-only offline fake; the
  single isolation seam.

## Design, validation, and known limits

- Spec: [`docs/experiments/2026-08-09-visual-regression-gate-mvp.md`](../docs/experiments/2026-08-09-visual-regression-gate-mvp.md)
- MVP run log: [`RESULTS.md`](./RESULTS.md)
- A-layer catch test + interpretation-bias test: [`EXPERIMENTS.md`](./EXPERIMENTS.md)
- Self-vs-stranger judging experiment (and the `contentKey` diff bug it surfaced, now fixed in
  `diff.mjs`): [`EXPERIMENT-SELF-VS-OTHER.md`](./EXPERIMENT-SELF-VS-OTHER.md)
