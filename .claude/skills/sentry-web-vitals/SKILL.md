---
name: sentry-web-vitals
description: Fetch and compare per-route p75 Web Vitals (LCP/FCP/CLS) from Sentry Discover for the daily-writing-friends production project, with an F2-weighted score and pre/post-deploy diff. Use when the user wants to verify whether performance improved or regressed after a deploy, compare pre/post-merge windows for a PR, identify the worst-performing routes for the next perf push, or sanity-check a Web Vitals claim. Triggers - "web vital 확인해줘", "p75 비교", "회귀 있나", "perf 점수", "이 PR 머지 후 LCP 어떻게 됐어", "sentry에서 가져와".
---

# Sentry Web Vitals analysis

## What this skill does

Pulls per-route p75 LCP/FCP/CLS from Sentry Discover, normalizes route IDs, and prints a markdown comparison table with deltas and an F2-weighted score. Used to verify performance changes against production data, not synthetic harness output.

## Prerequisites

- `SENTRY_AUTH_TOKEN` env var set (Sentry user auth token with `org:read` + `event:read`)
- `python3` + `curl` on PATH
- Org/project default to `bumgeun-song` / `4508460981747712` — override with `SENTRY_ORG` / `SENTRY_PROJECT_ID` if needed

## Quick workflow

For a "did this PR actually improve perf?" question, run the comparison script with a pre-merge baseline and a post-deploy window:

```bash
scripts/compare.py 2026-05-28T00:00:00 2026-06-04T14:09:06 \
                   2026-06-13T08:06:50 2026-06-21T05:27:00
```

Output is a markdown table with route, sample size, p75 LCP/FCP/CLS pre→post with percentage delta, and the F2 score per route + a count-weighted overall.

For a one-off snapshot (no comparison), use the raw query:

```bash
scripts/query.sh 2026-06-13T00:00:00 2026-06-21T00:00:00 | python3 -m json.tool
```

## Picking time windows

- **Baseline**: pick a 7-day window before the change merged. Use the merge commit time from `gh pr view <num> --json mergedAt`.
- **Post**: start from the deploy completion time, not merge time. End at "now" or whenever you want to cut.
- **Minimum length**: 4 days post-deploy. Less than that and `/board/*/post/*` will have <10 LCP samples and any delta is noise.
- **Window matching is NOT required** — the script reports normalized per-route p75, so 7d vs 4d is fine (the comparison is rate-independent).

## Interpreting the output

- **Sample column** shows LCP-measured pageloads per route. The marker ⚠️ means n<20 — treat the p75 as directional, not a number to act on.
- **F2 score** uses the same weighting as the local perf harness (LCP 0.5 + FCP 0.2 + CLS 0.3) with Google thresholds (Good=1.0, Needs Improvement=0.5, Poor=0). The count-weighted overall at the bottom is what most closely tracks the harness's "overall F2" claim.
- **Volume drop post-deploy is normal** in this app — many users sit on stale PWA service worker builds for several days. Do NOT chase it. Trust per-route p75 when n≥20.

## When the data looks wrong

If the post-window has `<10` samples on the routes you care about after >7 days, the cause is usually:
- Sample rate was reverted to 0 or unset (check `apps/web/src/sentry.ts` — `SENTRY_CONFIG.TRACE_SAMPLE_RATE` should be ≥0.2)
- BrowserTracing integration removed entirely (check `integrations:` includes `reactRouterV6BrowserTracingIntegration`)
- `wrapCreateBrowserRouterV6` not used (check `router.tsx` uses `sentryCreateBrowserRouter`)

See [references/methodology.md](references/methodology.md) for thresholds, route aggregation rules, the `boardLoader` non-pageload gotcha, and the F2 formula.
