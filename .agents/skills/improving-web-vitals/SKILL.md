---
name: improving-web-vitals
description: Use when the user wants to improve daily-writing-friends production Web Vital scores (LCP/FCP/CLS) by running additional iterations of the local perf harness to drive the overall F2 score higher. Triggers - "web vital 개선", "LCP 줄여", "F2 점수 올려", "harness 한 번 더 돌려", "perf 개선 작업", "perf iteration", "drive score up".
---

# Improving Web Vitals with the perf harness

## What this skill does

Walks one iteration of the `scripts/perf-harness/` improvement loop: ask `suggest` what to target, make ONE conceptual change in app code, let `eval` score it, read the verdict, repeat until target or stagnation.

**The harness is the ruler.** Your job is to feed it candidate changes — not to redesign it. Every file under `scripts/perf-harness/` is locked; editing one will VOID your iteration.

## Prerequisites (check once per session)

```bash
# 1. Node — Homebrew node 21 crashes the harness. Always pin nvm 22.14.0.
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"

# 2. Local Supabase up (the harness measures against the local backend).
supabase status 2>/dev/null | grep -q 'API URL' || supabase start

# 3. Fixture must exist.
[ -f tests/fixtures/perf-fixture.json ] || pnpm tsx scripts/seed-perf-fixture.ts

# 4. State seeded (one-time, ~70 min — only on first run or after config changes).
[ -f .perf-harness/epsilon.json ] || node scripts/perf-harness/measure-epsilon.mjs --samples 10
[ -f .perf-harness/best.json ]    || node scripts/perf-harness/loop.mjs init
```

If state files exist, skip to the loop.

## The single iteration — repeat this

### Step 1: Ask suggest what to target

```bash
node scripts/perf-harness/loop.mjs suggest 2>&1 | grep -v -i firebase
```

`suggest` ranks (route × metric) by max possible Δoverall and shows recent ACCEPTed / REVERTed entries. **Trust the ranking.** It already factors in traffic weight, metric weight, and current sub-score.

- ✓ next to a row = that single metric can clear ε(overall) on its own. Pick from these first.
- "Recent REVERTed" tells you what to avoid repeating, and why.
- "Recent ACCEPTed" shows working patterns — adapt, don't copy verbatim.

### Step 2: Pick exactly ONE conceptual change

Pick the top-ranked candidate whose fix you can describe in ONE sentence. If "the top candidate needs a 5-file refactor to land", drop to the next-ranked candidate — atomic changes win because the gate can revert a single hypothesis cleanly.

A change is "one conceptual change" if it fits this template: "make X lazy / drop Y / defer Z." If your `--note` reads like "and also …", split the work.

### Step 3: Edit app code ONLY

Allowed: `apps/**`, `packages/**`.
**Forbidden** (will VOID the iteration):
- `scripts/perf-harness/**`
- `scripts/seed-perf-fixture.ts`
- `tests/fixtures/perf-fixture.json`
- `.perf-harness/**`
- `docs/plans/2026-05-31-web-vitals-loop-design.md`

### Step 4: Eval — the gate decides

```bash
node scripts/perf-harness/loop.mjs eval --note "what I changed and why" 2>&1 | grep -v -i firebase
```

Takes ~5–7 min (median-3, then median-9 if marginal). It **auto-commits on ACCEPT** and **auto-reverts otherwise**. Do NOT manually `git add` or `git commit` for app changes — the gate owns that path.

Never pipe through `tail` — a prior run hid a fatal crash that way.

### Step 5: Read the verdict

| Verdict | Meaning | Your next move |
|---|---|---|
| **ACCEPT** | Δ > ε, survived median-9, no route regressed, cross-check passed | Committed. Go back to step 1. |
| **REVERT** | Δ < −ε OR \|Δ\| ≤ ε after median-9 OR a route fell below floor OR cross-check failed | Reverted. Pick a DIFFERENT candidate. |
| **NOOP** | apparent Δ but no app diff staged → measurement noise | best.json untouched. Pick next. |
| **VOID** | locked path touched OR page didn't render | Fix the violation; retry. |
| **REMEASURE** | median-3 was marginal | Driver auto-reruns median-9; just wait. |

### Step 6: Stop check

Stop when **either**:
- `overall ≥ 0.70` (target reached), or
- stagnation streak hits 10 (no accepted gain in 10 iterations).

## Picking changes that ACCEPT — proven patterns from PR #623

The 11 accepted changes from the original 60-iteration run cluster into these patterns:

| Pattern | Concrete example |
|---|---|
| Lazy-load below-the-fold components | `lazy(() => import('@/Toaster'))`, lazy `Comments`, lazy `BestPostCardList` |
| Drop serial RTT gates blocking queries | Remove `isConfigLoading` gate from `RootRedirect` |
| Defer non-critical third-party | `tracesSampleRate: 0`, `traceFetch: false`, `traceXHR: false` |
| Replace helmet with imperative `useEffect` meta upsert | Drops a provider from the entry critical path |
| Pre-seed route loader cache | postDetail loader cache seed before the chunk arrives |
| Trim aggregate queries on feed | drop `comments(count)` / `replies(count)` / `boards(first_day)` |
| Vite hygiene | disable modulepreload polyfill, esbuild `drop: ['console','debugger']` |
| Strip global listeners from LCP window | turn `useNavigationTracking` into a no-op for measurement |

## Anti-patterns — never try these

| Don't | Why |
|---|---|
| Bundle 2–3 fixes into one `eval` | One regresses → entire iteration REVERTs and you can't tell which |
| Add `useMemo`/`useCallback` "for speed" | Almost always within noise; pollutes the ledger |
| "Optimize" the harness because each eval feels slow | Locked → VOID. 5–7 min/eval is the price of statistical rigor |
| Re-derive ε just because some time passed | ε re-derivation is ~70 min; only do it after config or route changes |
| Edit `scripts/perf-harness/**` to "fix" something | VOID. If the harness genuinely needs a change, exit the loop, change it, COMMIT, then restart |
| Retry the same change after REVERT, hoping for better median | The gate already ran median-9. Trust it. |

## Rationalizations to catch yourself making

| Excuse | Reality |
|---|---|
| "This change should help even though it's not in the top 5" | Lower rank = less expected reward. Trust `suggest`. |
| "I'll bundle two small fixes since they're conceptually related" | One can regress and you lose both. Atomic. |
| "The verdict was REVERT but I think it's actually good" | The gate ran median-9 against ε. Your hunch is not better than the data. |
| "I'll skip ε re-calib, the baseline barely shifted" | Even small shifts under-seed best.json and cause phantom ACCEPTs |
| "Let me edit ready.mjs to make this route's gate less strict" | VOID. The strict gate is the only thing stopping reward-hacking |
| "Let me push the commit, the harness already committed it" | The harness commits locally only. Push separately when the user asks. |

## When to pause and ask the user

- After ~5 iterations: report overall score progress before grinding more.
- Stagnation 7+: stop and ask whether to change strategy (e.g. rest the loop and look at production Sentry).
- If `eval` outputs a fatal crash (not REVERT) or repeated VOID: stop immediately.
- Before pushing accepted commits to a PR: ALWAYS ask. The auto-commit is local.

## Verifying production after a perf PR merges

After this loop's commits ship to production, verify the gains actually landed in real user data — use the `sentry-web-vitals` skill to pull pre/post p75 from Sentry Discover.

## Deeper reference

[scripts/perf-harness/HANDOFF.md](../../../scripts/perf-harness/HANDOFF.md) is the canonical operator handoff (scoring formula, ε derivation, verdict semantics). Read it once per session — everything in this skill points back to it.
