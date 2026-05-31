// F2 metric score + N1 normalization.
// LOCKED FILE — off-limits to the optimization loop.
//
// Per-metric, linear-to-target normalization gives the loop a non-saturating
// gradient (unlike Lighthouse's log-normal composite, which flattens in the
// "poor" regime where this app currently sits).

import { TARGETS, METRIC_WEIGHTS, TRAFFIC } from './config.mjs';

const METRICS = ['lcp', 'fcp', 'cls'];

/**
 * Normalize one metric to [0,1]: 0 = baseline (start), 1 = target ("good") or better.
 *   s = clamp((baseline - value) / (baseline - target), 0, 1)
 * If baseline <= target (already good at start) the metric contributes a flat 1.
 */
export function normalizeMetric(metric, value, baseline) {
  const target = TARGETS[metric];
  const span = baseline - target;
  if (!(span > 0)) return 1; // already at/under target at baseline
  return clamp((baseline - value) / span, 0, 1);
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

/**
 * route_score = Σ w_m · s_m over {lcp, fcp, cls}.
 * @param metrics  { lcp, fcp, cls } raw values (ms, ms, unitless)
 * @param baseline { lcp, fcp, cls } per-route baseline raw values
 * @returns { score, sub } where sub holds per-metric { value, baseline, s }
 */
export function scoreRoute(metrics, baseline) {
  const sub = {};
  let score = 0;
  for (const m of METRICS) {
    const s = normalizeMetric(m, metrics[m], baseline[m]);
    sub[m] = { value: metrics[m], baseline: baseline[m], s: round4(s) };
    score += METRIC_WEIGHTS[m] * s;
  }
  return { score: round4(score), sub };
}

/**
 * overall = traffic-weighted average of route_scores.
 * @param routeScores { [routeKey]: number }
 */
export function scoreOverall(routeScores) {
  let wsum = 0;
  let acc = 0;
  for (const [key, score] of Object.entries(routeScores)) {
    const w = TRAFFIC[key] ?? 0;
    wsum += w;
    acc += w * score;
  }
  return wsum > 0 ? round4(acc / wsum) : 0;
}

function round4(x) {
  return Math.round(x * 10000) / 10000;
}
