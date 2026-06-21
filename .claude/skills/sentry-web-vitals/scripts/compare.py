#!/usr/bin/env python3
"""Compare per-route p75 Web Vitals between two Sentry windows.

Usage:
  compare.py <pre_start> <pre_end> <post_start> <post_end>

Times are ISO 8601, e.g. 2026-06-13T08:06:50.
Reads SENTRY_AUTH_TOKEN from env (passed through to query.sh).
"""
import json
import os
import pathlib
import subprocess
import sys
from collections import defaultdict

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
QUERY = SCRIPT_DIR / "query.sh"

LCP_GOOD, LCP_POOR = 2500, 4000
FCP_GOOD, FCP_POOR = 1800, 3000
CLS_GOOD, CLS_POOR = 0.1, 0.25

W_LCP, W_FCP, W_CLS = 0.5, 0.2, 0.3

SMALL_SAMPLE = 20


def fetch(start: str, end: str) -> list[dict]:
    res = subprocess.run(
        [str(QUERY), start, end], capture_output=True, text=True, check=True
    )
    return json.loads(res.stdout)["data"]


def normalize_route(t: str | None) -> str:
    """Collapse Firestore-style IDs (>=18-char mixed-case alnum) to '*'."""
    if t is None:
        return "<none>"
    parts = []
    for p in t.split("/"):
        is_id = len(p) >= 18 and p.isalnum() and any(c.isupper() for c in p)
        parts.append("*" if is_id else p)
    return "/".join(parts)


def aggregate(rows: list[dict]) -> dict[str, dict]:
    """Sum counts and weight-average p75s by normalized route."""
    agg: dict[str, dict] = defaultdict(
        lambda: {
            "count": 0, "wv_n": 0,
            "lcp_sum": 0.0, "lcp_n": 0,
            "fcp_sum": 0.0, "fcp_n": 0,
            "cls_sum": 0.0, "cls_n": 0,
        }
    )
    for r in rows:
        route = normalize_route(r["transaction"])
        n = r["count()"] or 0
        wv = r.get("count_web_vitals(measurements.lcp,any)") or 0
        agg[route]["count"] += n
        agg[route]["wv_n"] += wv
        for short, key in [
            ("lcp", "p75(measurements.lcp)"),
            ("fcp", "p75(measurements.fcp)"),
            ("cls", "p75(measurements.cls)"),
        ]:
            v = r.get(key)
            if v is not None and wv > 0:
                agg[route][f"{short}_sum"] += float(v) * wv
                agg[route][f"{short}_n"] += wv

    out: dict[str, dict] = {}
    for route, a in agg.items():
        out[route] = {
            "count": a["count"],
            "wv_n": a["wv_n"],
            "lcp": a["lcp_sum"] / a["lcp_n"] if a["lcp_n"] else None,
            "fcp": a["fcp_sum"] / a["fcp_n"] if a["fcp_n"] else None,
            "cls": a["cls_sum"] / a["cls_n"] if a["cls_n"] else None,
        }
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
    sl = score(row["lcp"], LCP_GOOD, LCP_POOR)
    sf = score(row["fcp"], FCP_GOOD, FCP_POOR)
    sc = score(row["cls"], CLS_GOOD, CLS_POOR)
    total, weight = 0.0, 0.0
    for s, w in [(sl, W_LCP), (sf, W_FCP), (sc, W_CLS)]:
        if s is not None:
            total += s * w
            weight += w
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

    pre_sum = post_sum = pre_w = post_w = 0.0
    for r in routes:
        pre = pre_a.get(r) or {"count": 0, "wv_n": 0, "lcp": None, "fcp": None, "cls": None}
        post = post_a.get(r) or {"count": 0, "wv_n": 0, "lcp": None, "fcp": None, "cls": None}
        if (pre["wv_n"] + post["wv_n"]) == 0:
            continue
        f2_pre, f2_post = f2(pre), f2(post)
        if f2_pre is not None:
            pre_sum += f2_pre * pre["count"]
            pre_w += pre["count"]
        if f2_post is not None:
            post_sum += f2_post * post["count"]
            post_w += post["count"]
        marker = " ⚠️" if (pre["wv_n"] < SMALL_SAMPLE or post["wv_n"] < SMALL_SAMPLE) else ""
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
    print("\nLegend: ⚠️ = LCP sample <20, treat p75 as directional only.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
