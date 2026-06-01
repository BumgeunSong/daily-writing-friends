# Web Vitals AutoResearch — Operator Handoff

You are an autonomous optimization agent running a long-horizon experiment:
**hill-climb the Web Vitals of "매일 글쓰기 프렌즈" (Daily Writing Friends)** by
editing app code one change at a time and letting an empirical gate judge each
change. This file is everything you need to run an iteration cold. Read it fully
before touching anything.

The harness (everything under `scripts/perf-harness/`) is **validated and frozen**.
Your job is to improve the app, not the harness.

---

## 0. The mission in one line

Drive `overall` (traffic-weighted F2 score of real-throttled Web Vitals across 4
routes) from its calibrated baseline **0.2729** toward the target **0.70**, one
gate-approved change at a time, without regressing any route.

---

## 1. The loop — run this every iteration

```
# 1. PATH: Homebrew node 21 is broken (crashes). ALWAYS use nvm v22.14.0.
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"

# 2. READ the feedback report — this tells you where the headroom is.
node scripts/perf-harness/loop.mjs status 2>&1 | grep -v -i firebase

# 3. PICK EXACTLY ONE change (see §4) and make it in app code only (apps/, packages/).

# 4. EVAL — score the change, auto-commit on ACCEPT, auto-revert otherwise.
node scripts/perf-harness/loop.mjs eval --note "what I changed and why" \
  2>&1 | grep -v -i firebase

# 5. READ the verdict (§5). Then go back to step 2. Repeat until a stop condition (§7).
```

- The `grep -v -i firebase` filter only removes noisy Firebase SDK logs. Never pipe
  through `tail` — a prior run hid a fatal crash and its non-zero exit that way.
- `eval` does its own build, measurement, re-measurement, commit/revert, and ledger
  append. You do **not** build or commit manually for app changes; the gate owns that.
- One `eval` takes ~5–7 min (median-3, then median-9 confirm if the delta looks real).

---

## 2. What "one change" means and how to choose it

The reward is dominated by **traffic weight**. Per-route weights (Sentry 30-day):

| Route | key | traffic | weight share |
|---|---|---:|---:|
| `/` → `/boards` | root | 830 | ~53% |
| `/notifications` | notifications | 369 | ~24% |
| `/board/*` | boardFeed | 181 | ~12% |
| `/board/*/post/*` | postDetail | 136 | ~9% |

`route_score = 0.5·LCP + 0.2·FCP + 0.3·CLS` (each metric normalized — see §6).
`overall = Σ traffic·route_score / Σ traffic`.

**So the highest-leverage work is LCP on `/` (root).** A 1-point LCP gain on root is
worth ~6× the same gain on postDetail.

Pick changes by **expected reward per unit risk**:
1. Prefer changes that help a high-traffic route's worst metric (the gradient in
   `status` shows raw ms vs target and the sub-score `s=`).
2. Prefer changes whose effect should exceed the noise floor ε (§3). A change you
   expect to move `overall` by < ε will just REVERT — don't waste an iteration on it.
3. One conceptual change per iteration. If it bundles several edits that's fine, but
   they must share one hypothesis you can name in `--note`. Atomic changes keep the
   ledger interpretable and make reverts clean.

Likely first levers (the bundle is heavy on first paint — `index` 463KB +
`react-vendor` 394KB + `supabase-vendor` 204KB all load on the entry route):
- Code-split / lazy-load below-the-fold and route-specific chunks off the root entry.
- Defer or async non-critical third parties (Sentry, confetti, analytics) so they
  don't block LCP/FCP.
- Preload the LCP image/font; reserve space to kill the **boardFeed CLS 0.136→0.10**
  regression (the only route currently failing CLS).
- Trim what `react-vendor` / `supabase-vendor` ship on the critical path.

Always verify a change is functionally correct (the app must still work — the
functional gate will VOID a broken build, but don't rely on it as your only check).

---

## 3. The noise floor ε (why changes must be big enough)

Measurement wobbles even on identical code. ε is the std of that wobble, measured
empirically over 10 isolated baseline re-measures:

- **ε(overall) = 0.0057**
- ε per route: root 0.0107 (noisiest), boardFeed 0.0051, postDetail 0.0028,
  notifications 0.0044
- expected (mean) overall of unchanged code = **0.2729** ← `best.json` is seeded here

A change must move `overall` by **more than ε** and survive a median-9 re-measure to
be accepted. To re-derive ε (only if the baseline build changes):

```
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
node scripts/perf-harness/measure-epsilon.mjs --samples 10 2>&1 | grep -v -i firebase
node scripts/perf-harness/loop.mjs init      # re-seed best.json from the new means
```

`measure-epsilon` runs each sample in its own child process on purpose — Lighthouse +
Playwright leak native memory and a single long-lived process OOM-crashes around
sample 7. Don't "optimize" that back into one process.

---

## 4. (reserved — folded into §2)

---

## 5. Verdicts — what `eval` can return

| Verdict | Meaning | Side effect |
|---|---|---|
| **ACCEPT** | Δoverall > +ε AND survived median-9 AND no route regressed AND cross-check passed | commit, update `best.json`, advance |
| **REVERT** | Δ < −ε, or `|Δ| ≤ ε` after median-9 (unproven), or a route fell below its floor, or cross-check failed | app changes reverted (`git checkout`/`clean` on apps+packages) |
| **NOOP** | apparent gain but nothing staged in apps/packages → it was noise | `best.json` untouched |
| **VOID** | you touched a locked file, or the build/page wasn't functionally ready | nothing scored; fix and retry |
| **REMEASURE** | median-3 was marginal (`|Δ| ≤ ε`) | driver auto-re-runs median-9; you'll see the final verdict |

Guardrails that can turn an apparent win into REVERT/VOID:
- **Regression floor:** no route may drop below `prior_best − 2·ε_route`, even if
  `overall` rose. Stops trading a high-traffic regression for a cheap win elsewhere.
- **Cross-check:** CLS must agree between engines (same DOM) and the Lighthouse-simulate
  direction must not contradict the Web-Vitals gain (anti reward-hacking).
- **Locked paths:** anything under `scripts/perf-harness/` is off-limits to the loop.
  Edit only `apps/**` and `packages/**`.
- **Functional gate:** the page must actually render/be ready, or the measurement VOIDs.

---

## 6. Scoring detail (for reasoning about expected reward)

Per metric: `s = clamp((baseline − value) / (baseline − target), 0, 1)`;
returns 1 if already at/under target. Targets: LCP 2500ms, FCP 1800ms, CLS 0.10.
The clamp at 0 is why `best` is seeded at the **mean** of re-measures, not at
`score(baseline,baseline)` — the clamp rectifies downside noise upward, so the
floor is the *minimum* not the *center*; seeding at the floor made every reading
look like a phantom win. (This was the pivotal calibration bug; don't reintroduce it.)

Reward = **real-throttled Web Vitals** (CDP 4× CPU, 1.6Mbps, 150ms RTT, mobile
360×640). Lighthouse-simulate is the cross-check only — its Lantern model already
reports the app as "good", so it's saturated and not the score.

---

## 7. Stop conditions

Stop and report when **either**:
- `overall ≥ 0.70` (target reached), or
- **stagnation ≥ 10** consecutive non-improving iterations (no accepted gain).

The driver prints the stop banner; `status` shows `stagnation N/10`. The ledger
(`.perf-harness/ledger.jsonl`) is the source of truth for the streak — it is
currently empty (validation entries cleared), so the count starts fresh at 0.

---

## 8. State files (all gitignored, under `.perf-harness/`)

- `baseline.json` — frozen per-route WV medians (the denominator of every score).
- `epsilon.json` — ε(overall), per-route ε, and the calibrated means.
- `best.json` — best-so-far overall + route scores + metrics. Updated only on ACCEPT.
- `ledger.jsonl` — one line per `eval`: verdict, delta, note, scores. The audit trail.

`best.json` and `epsilon.json` are already seeded and valid. Do not hand-edit them;
use `loop.mjs init` / `measure-epsilon.mjs` if they ever need rebuilding.

---

## 9. Security constraints (carry forward, non-negotiable)

- A **prod Supabase `service_role` key was exposed in chat earlier**. NEVER print,
  echo, log, or commit it. It lives only in `/tmp/sb-prod.env` (outside the repo).
  **Recommend the user rotate it** when this exercise wraps up.
- If you ever probe prod content for data shape, output **aggregate shape only**
  (counts, length distributions) — never raw post bodies.
- Any seed/fixture must anonymize PII, use synthetic text, and stay gitignored.
- The local Supabase anon key / `e2e@example.com` test creds in `config.mjs` are
  public local defaults and are safe.

---

## 10. Done so far / where you are now

- Harness built & **validated end-to-end**: a no-op `eval` correctly REVERTs
  (median-3 REMEASURE → median-9 REVERT) against ε=0.0057. No phantom accepts.
- Calibration fixes committed: `3fab0b40` (seed-at-mean + median-9 confirm + 2·ε
  regression band) and `702a1f23` (per-sample process isolation to kill the OOM).
- `best.json` seeded at the calibrated mean **0.2729**; ledger cleared; stagnation 0/10.

**Next action:** run §1. Read `status`, pick the highest-leverage root-LCP change you
can justify beating ε, make it in app code, `eval`, read the verdict, repeat.

Every route is far below target (LCP ~3.3–4.4s vs 2.5s, FCP ~2.8–3.9s vs 1.8s) —
the headroom is real and unsaturated. Go climb it, one proven step at a time.
