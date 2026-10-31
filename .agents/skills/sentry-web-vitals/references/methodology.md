# Web Vitals analysis methodology

## Google Web Vitals thresholds (2024)

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| LCP | ≤ 2500ms | 2500–4000ms | > 4000ms |
| FCP | ≤ 1800ms | 1800–3000ms | > 3000ms |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 |

## F2 score formula

F2 weights LCP heaviest because it dominates perceived load on this app's hot routes (board list, post detail). Same weighting the local perf harness from PR #622 uses.

```
score(metric) = 1.0 if Good, 0.5 if Needs Improvement, 0.0 if Poor

F2 = (score(LCP)*0.5 + score(FCP)*0.2 + score(CLS)*0.3) / sum_of_weights_with_data
```

The denominator drops weights for missing metrics (e.g. CLS=null), so a route with only LCP+FCP data still produces a valid score on the available metrics rather than getting penalized.

## Sample size guidance

- **n ≥ 50**: trust the delta as an actionable number.
- **20 ≤ n < 50**: trust the direction, treat the magnitude as ±20%.
- **n < 20**: directional only; do NOT cite the percentage.
- **n < 5**: ignore entirely; one outlier moves the p75.

The compare script marks rows below n=20 with `⚠️`.

## Route aggregation

Sentry sometimes records routes with the literal Firestore ID instead of the parameterized form (e.g. `/board/rW3Y3E2aEbpB0KqGiigd` vs `/board/*`). This depends on whether `sentryCreateBrowserRouter` was active when the transaction was emitted — older builds without it produce the literal-ID form.

`compare.py` normalizes any path segment matching `[18+ chars, alnum, has uppercase]` to `*`. This catches Firestore IDs cleanly. If you see a UUID-like path leaking through, extend `normalize_route()` in `scripts/compare.py`.

## Gotchas

### `boardLoader` and other non-pageload transactions

These show as transactions with high count but `count_web_vitals(...)` = 0 — they're React Router data loaders, not pageloads. Web Vitals are only collected for pageload/navigation transactions. The compare script skips rows where both windows have 0 web-vital samples.

### `dataset=metrics` returns empty

The Sentry Discover API has two transaction-like datasets. `dataset=metrics` uses the aggregated metrics store which strips per-event web vital measurements. Always use `dataset=transactions` (already hardcoded in `query.sh`).

### Volume drops post-deploy

It is normal to see 5–10× fewer transactions/day in the first week after a deploy because PWA service workers keep some users on the old build. Do not interpret this as a WAU drop or a Sentry bug. The per-route p75 is still meaningful — just wait for n to recover before drawing conclusions on small-traffic routes.

### Sample rate vs transaction emission

`tracesSampleRate` controls whether the SDK *emits* the transaction to Sentry — it does not control whether `PerformanceObserver` runs (it always does). So lowering the rate cuts Sentry volume but does not save any client-side cost. The default `apps/web/src/sentry.ts` sample rate is what to check first if volume seems off.

## Sentry Discover query reference

The query script hits `GET /api/0/organizations/{org}/events/`. Useful additional fields if you want to extend the script:

- `field=p50(measurements.lcp)` — median, less sensitive to outliers
- `field=p95(measurements.lcp)` — tail latency
- `field=p75(measurements.ttfb)` — server response time
- `field=p75(measurements.fid)` — input delay (largely replaced by INP)
- `field=p75(measurements.inp)` — Interaction to Next Paint (the new responsiveness metric)
- `field=failure_rate()` — error rate on the transaction
- `field=user_misery()` — Sentry's UX score

Add new fields to the `--data-urlencode "field=..."` lines in `scripts/query.sh`.

To filter to specific routes:

```bash
scripts/query.sh 2026-06-13T00:00:00 2026-06-21T00:00:00 \
  "event.type:transaction transaction:[/board/*,/notifications]"
```

To filter to a single release:

```bash
scripts/query.sh ... "event.type:transaction release:web@1.2.3"
```

## How to find merge/deploy timestamps

For pre/post windows, use git+GitHub:

```bash
gh pr view <num> --json mergedAt          # PR merge time (UTC)
git log --format="%H %aI %s" -n 20 main   # commit times
```

Deploy time is typically a few minutes after merge (CI build + Vercel deploy). For tight windows, look at the deploy log; for week-scale comparisons, merge time is close enough.
