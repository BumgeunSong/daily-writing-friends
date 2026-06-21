#!/usr/bin/env python3
"""Compare per-route p75 Web Vitals between two Sentry windows.

Usage:
  compare.py <pre_start> <pre_end> <post_start> <post_end>

Times are ISO 8601, e.g. 2026-06-13T08:06:50.
Reads SENTRY_AUTH_TOKEN from env (passed through to query.sh).
"""
import json
import pathlib
import subprocess
import sys
from collections import defaultdict

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
QUERY = SCRIPT_DIR / "query.sh"

# Each metric's full spec: Google "good/poor" thresholds, F2 weight, and the
# Sentry Discover field that carries its per-event value.
METRICS = {
    "lcp": {"good": 2500, "poor": 4000, "weight": 0.5, "sentry_field": "p75(measurements.lcp)"},
    "fcp": {"good": 1800, "poor": 3000, "weight": 0.2, "sentry_field": "p75(measurements.fcp)"},
    "cls": {"good": 0.1,  "poor": 0.25, "weight": 0.3, "sentry_field": "p75(measurements.cls)"},
}

MIN_TRUSTED_SAMPLES = 20

SENTRY_PAGELOAD_COUNT_FIELD = "count_web_vitals(measurements.lcp,any)"


def fetch(start: str, end: str) -> list[dict]:
    res = subprocess.run(
        [str(QUERY), start, end], capture_output=True, text=True, check=True
    )
    return json.loads(res.stdout)["data"]


def looks_like_firestore_id(segment: str) -> bool:
    return len(segment) >= 18 and segment.isalnum() and any(c.isupper() for c in segment)


def normalize_route(t: str | None) -> str:
    if t is None:
        return "<none>"
    return "/".join("*" if looks_like_firestore_id(p) else p for p in t.split("/"))


def aggregate(rows: list[dict]) -> dict[str, dict]:
    """Sum counts and weight-average p75s by normalized route."""

    def new_bucket() -> dict:
        bucket: dict = {"count": 0, "wv_n": 0}
        for metric in METRICS:
            bucket[f"{metric}_sum"] = 0.0
            bucket[f"{metric}_n"] = 0
        return bucket

    agg: dict[str, dict] = defaultdict(new_bucket)
    for r in rows:
        route = normalize_route(r["transaction"])
        pageloads_with_lcp = r.get(SENTRY_PAGELOAD_COUNT_FIELD) or 0
        agg[route]["count"] += r["count()"] or 0
        agg[route]["wv_n"] += pageloads_with_lcp
        for metric, spec in METRICS.items():
            value = r.get(spec["sentry_field"])
            if value is not None and pageloads_with_lcp > 0:
                agg[route][f"{metric}_sum"] += float(value) * pageloads_with_lcp
                agg[route][f"{metric}_n"] += pageloads_with_lcp

    out: dict[str, dict] = {}
    for route, a in agg.items():
        per_route = {"count": a["count"], "wv_n": a["wv_n"]}
        for metric in METRICS:
            samples = a[f"{metric}_n"]
            per_route[metric] = a[f"{metric}_sum"] / samples if samples else None
        out[route] = per_route
    return out


def score(val: float | None, good: float, poor: float) -> float | None:
    if val is None:
        return None
    if val <= good:
        return 1.0
    if val >= poor:
        return 0.0
    return 0.5


def f2(row: dict) -> float | None:
    total, weight = 0.0, 0.0
    for metric, spec in METRICS.items():
        metric_score = score(row[metric], spec["good"], spec["poor"])
        if metric_score is not None:
            total += metric_score * spec["weight"]
            weight += spec["weight"]
    return total / weight if weight else None


def ms(v: float | None) -> str:
    return "—" if v is None else f"{v:.0f}ms"


def cls_fmt(v: float | None) -> str:
    return "—" if v is None else f"{v:.3f}"


def delta_pct(pre: float | None, post: float | None) -> str:
    if pre is None or post is None or pre == 0:
        return "—"
    return f"{(post - pre) / pre * 100:+.0f}%"


def score_fmt(v: float | None) -> str:
    return "—" if v is None else f"{v:.2f}"


def has_untrusted_sample(row: dict) -> bool:
    return row["wv_n"] < MIN_TRUSTED_SAMPLES


def main() -> int:
    if len(sys.argv) != 5:
        print(__doc__, file=sys.stderr)
        return 1
    pre_start, pre_end, post_start, post_end = sys.argv[1:5]

    pre_a = aggregate(fetch(pre_start, pre_end))
    post_a = aggregate(fetch(post_start, post_end))

    routes = sorted(
        set(pre_a) | set(post_a),
        key=lambda r: -(pre_a.get(r, {}).get("count", 0) + post_a.get(r, {}).get("count", 0)),
    )

    print("# Web Vitals comparison\n")
    print(f"- Pre  window: `{pre_start}` → `{pre_end}`")
    print(f"- Post window: `{post_start}` → `{post_end}`\n")
    print("| Route | n (pre/post) | LCP pre → post (Δ) | FCP pre → post (Δ) | CLS pre → post | F2 pre → post |")
    print("|---|---|---|---|---|---|")

    empty_row = {"count": 0, "wv_n": 0, "lcp": None, "fcp": None, "cls": None}
    pre_sum = post_sum = pre_w = post_w = 0.0
    for r in routes:
        pre = pre_a.get(r) or empty_row
        post = post_a.get(r) or empty_row
        if (pre["wv_n"] + post["wv_n"]) == 0:
            continue
        f2_pre, f2_post = f2(pre), f2(post)
        if f2_pre is not None:
            pre_sum += f2_pre * pre["count"]
            pre_w += pre["count"]
        if f2_post is not None:
            post_sum += f2_post * post["count"]
            post_w += post["count"]
        marker = " ⚠️" if has_untrusted_sample(pre) or has_untrusted_sample(post) else ""
        print(
            f"| `{r}` | {pre['wv_n']}/{post['wv_n']}{marker} "
            f"| {ms(pre['lcp'])} → {ms(post['lcp'])} ({delta_pct(pre['lcp'], post['lcp'])}) "
            f"| {ms(pre['fcp'])} → {ms(post['fcp'])} ({delta_pct(pre['fcp'], post['fcp'])}) "
            f"| {cls_fmt(pre['cls'])} → {cls_fmt(post['cls'])} "
            f"| {score_fmt(f2_pre)} → {score_fmt(f2_post)} |"
        )

    avg_pre = pre_sum / pre_w if pre_w else 0
    avg_post = post_sum / post_w if post_w else 0
    print(f"\n**Weighted-avg F2: {avg_pre:.2f} → {avg_post:.2f}** (weighted by transaction count)")
    print(f"\nLegend: ⚠️ = LCP sample <{MIN_TRUSTED_SAMPLES}, treat p75 as directional only.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
