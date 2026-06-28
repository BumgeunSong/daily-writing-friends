---
name: run-web
description: Launch recipe for the daily-writing-friends web app (apps/web — Vite + React + React Router, dev server on http://localhost:5173). Use to build and run the app locally so /run and /verify can drive the real UI. Captures the mandatory nvm node-22 PATH prefix (the default Homebrew node is broken), the dev-server command and port, backend selection (cloud vs local Supabase), and the static gate commands (type-check, tests).
---

# Run: web app (apps/web)

This is a pnpm monorepo; the user-facing app is `apps/web` (Vite + React + React Router). The change surface is almost always the **browser UI at http://localhost:5173**.

## Toolchain (mise pins node — do this first)

The repo pins node via `.mise.toml` (`node = "22.14.0"`). With mise installed and active, `node`/`pnpm`/`vite`/`tsc` resolve to the pinned version automatically — no PATH juggling, and husky hooks pick it up too.

```bash
mise install      # once per machine/version bump: ensures node 22.14.0 is present (idempotent)
node -v           # -> v22.14.0
```

If a command still hits the broken Homebrew node (v21 → `Abort trap: 6`), mise isn't active in that shell. Either activate mise, or run through it explicitly: `mise exec -- pnpm --filter web dev`.

## Install

```bash
pnpm install
```

## Launch (default: cloud Supabase backend)

```bash
nohup pnpm --filter web dev > /tmp/dwf-dev.log 2>&1 &
# ready when the log prints the URL:
grep -m1 "Local:" /tmp/dwf-dev.log    # -> http://localhost:5173/
```

The app reads/writes the **cloud** Supabase project (`VITE_SUPABASE_URL` in `.env`). Good enough for read-only / UI work; do not exercise destructive write flows against it.

## Launch variant: local Supabase (for write/auth/RLS flows)

```bash
supabase start            # starts local stack; apply migrations first if DB is empty
pnpm --filter web dev:local   # Vite on http://localhost:5174 (mode local-supabase)
```

Use this when the change writes data, touches auth, or needs seeded/edge data you don't want against production. Local Supabase needs all migrations applied + notification triggers handled before the app works.

## Stop

```bash
lsof -ti:5173 | xargs kill 2>/dev/null   # or :5174 for dev:local
```

## Static gates (NOT runtime verification)

These prove it compiles and unit logic holds — they are gates, not evidence the feature works. `/verify` should still drive the running app.

```bash
pnpm --filter web type-check
pnpm --filter web test:run            # vitest; exit 1 can be a known Firebase-analytics
                                      # teardown rejection — read "Tests N passed", not just exit code
```

## Gotchas

- **node version**: `.mise.toml` pins it. If a shell lacks mise, commands hit the broken Homebrew node (v21, `Abort trap: 6`) — run `mise install` / `mise exec -- ...`.
- **cwd drift**: a prior `cd` persists across shell calls; prefer absolute or repo-root-relative paths, or `pnpm --filter web` from the repo root.
- **Port 5173 also used by E2E** (`dev:e2e`): when running Playwright E2E from a worktree, run from the repo root and watch for a stray dev server already holding :5173.
