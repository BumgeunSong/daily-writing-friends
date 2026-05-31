# Web Vitals Self-Improvement Loop — Design

**Date:** 2026-05-31
**Status:** Design locked, not yet implemented
**Goal:** A long-running LLM loop that hill-climbs the Web Vitals of "매일 글쓰기 프렌즈" (Daily Writing Friends), AutoResearch-style. The first priority is a *precise, clear scoring system* that gives the LLM enough feedback to loop on.

---

## 1. Scoring engine — Hybrid

- **Outer reward:** Lighthouse CI composite, used as the headline signal.
- **Inner diagnostic + cross-check:** Playwright + Google `web-vitals` library — measures the same metrics independently, captures INP, and serves as the reward-hack tripwire.
- The loop optimizes a **custom continuous metric score (F2)**, not the raw Lighthouse 0–100 composite, because the composite's log-normal curves saturate in the "poor" regime (at LCP ~9.6s, big real gains barely move the number → weak gradient).

## 2. Metric score (F2) + normalization (N1)

Per-metric, linear-to-target normalization:

```
s = clamp((baseline - value) / (baseline - target), 0, 1)
```

- Targets = Google "good" thresholds: **LCP 2.5s, FCP 1.8s, CLS 0.1**.
- Metrics scored: **LCP, FCP, CLS**. (INP deferred — zero prod field data today.)
- `route_score = w_lcp·s_lcp + w_fcp·s_fcp + w_cls·s_cls`
- `overall = traffic_weighted_avg(route_score)` with a **per-route regression floor** (no route may drop below its prior best minus noise).

## 3. Routes + traffic weights

Weights = **objective Sentry 30-day traffic** (not subjective priority):

| Route | Visits (30d) | Field p75 LCP / FCP / CLS |
|---|---|---|
| `/` (→ `/boards`) | 830 | 5780 / 4184 / 0.123 |
| `/notifications` | 369 | 3022 / 1807 / 0.097 |
| `/board/*` | 181 | 4728 / 3843 / 0.105 |
| `/board/*/post/*` | 136 | 5080 / 4634 / 0.095 |

(Lab ≠ field: Lighthouse mobile slow-4G+4×CPU gives LCP ~9.6s vs field p75 5.78s. Prod data informs *weights and trend*, not absolute targets.)

## 4. Determinism

- Mobile form factor + **simulated (Lantern) throttling**.
- **Median-of-3** runs per measurement (validated: bootstrap std 1.14 vs median-5's 1.05 — diminishing returns).
- Measure a **production build** (`vite build && vite preview`), never dev mode.
- **Frozen seed fixture** + injected auth (persistent Chrome + localStorage JWT, since Supabase stores the JWT in localStorage not cookies).

## 5. Frozen fixture (confirmed)

Deterministic SQL seed → `supabase db reset` + seed = identical state every run (also permanently fixes local kong/empty-DB friction).

- **Test user:** `active=true` + onboarded + member of ~4 boards, so `/` deterministically redirects to `/boards`.
- **Data:** `/boards` grid (~4 cards); `/board/*` feed (~50 posts); `/board/*/post/*` (post + ~3 comments); `/notifications` (~35 mixed).
- **Distributions (from prod shape):** content_length mostly ~1200 chars, some ~2000, a few ~3300, one long outlier; **21% of posts have 1 thumbnail** (text-dominant feed — do NOT over-add images); comments median 3.
- **Privacy:** synthetic anonymized text matching prod distributions; gitignored; never commit real user content.

---

## 6. Loop mechanics

### Iteration cycle

```
1. MEASURE baseline   → score_0 (run once; also measure ε here)
2. LLM reads feedback → picks ONE change
3. LLM applies change → edits app code only
4. BUILD + MEASURE    → score_n (median-3, all 4 routes)
5. DECIDE: keep or revert?  (accept gate, below)
6. COMMIT (if kept) + append to ledger
7. goto 2
```

### Feedback format (what the LLM sees each iteration)

A single structured report, not raw Lighthouse JSON:
- Normalized 0–1 `overall` + per-route `route_score` + per-metric sub-scores (the gradient).
- **Raw ms values** alongside (so the LLM reasons about real bottlenecks, not the squashed number).
- **Lighthouse-vs-web-vitals agreement line** (reward-hack tripwire).
- **vs-previous-best** deltas + regression flags.
- **Short ledger** of recent accepted/reverted changes (so it doesn't repeat reverted ideas).

### Accept gate — "re-measure on the margin" (option B)

Measurement is noisy (same code re-measured wobbles ±ε). Decision rule:

```
Δoverall > +ε   → ACCEPT (cheap, median-3)
Δoverall < −ε   → REVERT (cheap, median-3)
|Δoverall| ≤ ε  → re-measure median-9, then decide against tighter threshold
```

Spend extra measurement only when it matters. **ε is measured empirically on the actual local harness at baseline** (prod's ±0.01 is only a reference; the frozen-fixture local harness will have its own noise floor).

### Stop condition — A + C

- Stagnation: 10 consecutive iterations with no meaningful improvement → stop.
- Target reached: `overall` hits target (e.g. 0.7, set realistically after baseline) → stop.
- Whichever comes first.

### Reward-hacking guardrails — 1 + 2 + 3

1. **Cross-validation:** if Lighthouse score and web-vitals library values disagree → suspect manipulation, auto-reject.
2. **Functional test gate:** Playwright asserts the page actually renders (post list visible, post content rendered). Broken page → score void.
3. **Locked files:** scoring code / fixture / harness are off-limits to the LLM; it may edit **app code only**.

(Option 4, content-invariant checks, deferred — gate #2 covers most of it.)

---

## 7. Open implementation tasks

1. **Frozen seed fixture** — deterministic SQL seed for local Supabase matching the confirmed spec.
2. **Measurement harness** — local prod-build preview + frozen seed + injected auth + Lighthouse CI outer + Playwright/web-vitals inner; measure ε at baseline.
3. **Loop driver** — feedback-report generator, accept gate, ledger, stop condition, file-lock enforcement.
4. **Baseline capture** — first full measurement; set realistic target.

## 8. Security notes

- Prod Supabase service_role key was exposed in chat → **rotate it** after this exercise. Lives only in `/tmp/sb-prod.env` (outside repo), never committed.
- Prod content probing outputs aggregate shape only, never raw post bodies.
