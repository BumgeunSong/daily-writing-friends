// Accept gate (design §6, option B): "re-measure to confirm".
//
// Measurement wobbles ±ε even on identical code, so we never trust a single
// median-3 delta. A no-op validation run proved that median-3 tail noise can
// fake a Δ several × ε, so ANY apparent improvement (ACCEPT or marginal) is
// re-measured at median-9 and must clear ε AGAIN before it commits. The gate is
// a PURE decision function; the driver owns the side effects (re-measuring
// median-9, committing, reverting).
//
//   Δoverall > +ε        → ACCEPT     (provisional on median-3; confirmed on median-9)
//   Δoverall < −ε        → REVERT
//   |Δoverall| ≤ ε       → REMEASURE  (median-3 only; driver re-runs median-9, calls tightened)
//
// The threshold stays at the full median-3 ε on BOTH passes. We do NOT shrink it
// for the median-9 pass: a median-9 estimate already has std ≈ ε/√3, so demanding
// Δ > ε there is a ~1.7σ bar — the right direction for rejecting phantom wins.
// `tightened` therefore only makes the decision final (marginal band → REVERT
// instead of REMEASURE), it does not move the threshold.
//
// Plus a hard regression floor: no individual route may fall below its prior
// best minus that route's own noise — even if `overall` went up. This stops the
// loop from trading a high-traffic route's regression for a cheap win elsewhere.

// Per-route regression band, in units of that route's ε. best is seeded at the
// expected (mean) score, so the band must straddle the symmetric noise: 2ε.
const REGRESSION_BAND = 2;

/**
 * @param current  { overall, routeScores } from the latest measurement
 * @param best     { overall, routeScores } best-so-far (regression-floor reference)
 * @param epsilon  { overall, routes:{key:εk} } empirically measured noise floor
 * @param tightened  true once the driver has already re-measured at median-9
 */
export function decideGate(current, best, epsilon, tightened = false) {
  const delta = round(current.overall - best.overall);
  const epsOverall = epsilon.overall;

  // Regression floor first — a routed regression is disqualifying regardless of Δ.
  // Band is 2×ε_route: best is seeded at each route's EXPECTED (mean) score, so a
  // no-op route reading sits below the mean half the time and dips below mean−1ε
  // ~16% of the time. A 1ε band would false-flag ~33% of clean runs (measured);
  // 2ε leaves the genuine-regression signal while clearing all observed noise.
  const regressions = [];
  for (const [key, score] of Object.entries(current.routeScores)) {
    const prior = best.routeScores[key];
    if (prior == null) continue;
    const floor = prior - REGRESSION_BAND * (epsilon.routes?.[key] ?? epsilon.overall);
    if (score < floor) {
      regressions.push({ route: key, score: round(score), priorBest: round(prior), floor: round(floor) });
    }
  }
  if (regressions.length) {
    return {
      verdict: 'REVERT',
      delta,
      improved: false,
      regressions,
      reason: `route regression below floor: ${regressions.map((r) => r.route).join(', ')}`,
    };
  }

  if (delta > epsOverall) {
    return { verdict: 'ACCEPT', delta, improved: true, regressions, reason: `Δ ${fmt(delta)} > ε ${fmt(epsOverall)}` };
  }
  if (delta < -epsOverall) {
    return { verdict: 'REVERT', delta, improved: false, regressions, reason: `Δ ${fmt(delta)} < −ε ${fmt(epsOverall)}` };
  }
  if (!tightened) {
    return { verdict: 'REMEASURE', delta, improved: false, regressions, reason: `|Δ| ${fmt(delta)} ≤ ε ${fmt(epsOverall)} — re-measure median-9` };
  }
  // Still inside the noise band after the median-9 confirm: can't prove it helps → don't keep it.
  return { verdict: 'REVERT', delta, improved: false, regressions, reason: `|Δ| ${fmt(delta)} ≤ ε ${fmt(epsOverall)} after median-9 — unproven, reverting` };
}

function round(x) {
  return Math.round(x * 1e4) / 1e4;
}
function fmt(x) {
  return x.toFixed(4);
}
