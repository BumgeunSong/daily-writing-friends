// Accept gate (design §6, option B): "re-measure on the margin".
//
// Measurement wobbles ±ε even on identical code, so we never trust a single
// median-3 delta inside the noise band. The gate is a PURE decision function;
// the driver owns the side effects (re-measuring median-9, committing, reverting).
//
//   Δoverall > +ε        → ACCEPT
//   Δoverall < −ε        → REVERT
//   |Δoverall| ≤ ε       → REMEASURE (driver re-runs median-9, calls again tightened)
//
// Plus a hard regression floor: no individual route may fall below its prior
// best minus that route's own noise — even if `overall` went up. This stops the
// loop from trading a high-traffic route's regression for a cheap win elsewhere.

// median-9 averages 3× the samples of median-3, so its noise floor shrinks ~√3.
const TIGHTEN = Math.sqrt(3);

/**
 * @param current  { overall, routeScores } from the latest measurement
 * @param best     { overall, routeScores } best-so-far (regression-floor reference)
 * @param epsilon  { overall, routes:{key:εk} } empirically measured noise floor
 * @param tightened  true once the driver has already re-measured at median-9
 */
export function decideGate(current, best, epsilon, tightened = false) {
  const delta = round(current.overall - best.overall);
  const epsOverall = tightened ? epsilon.overall / TIGHTEN : epsilon.overall;

  // Regression floor first — a routed regression is disqualifying regardless of Δ.
  const regressions = [];
  for (const [key, score] of Object.entries(current.routeScores)) {
    const prior = best.routeScores[key];
    if (prior == null) continue;
    const floor = prior - (epsilon.routes?.[key] ?? epsilon.overall);
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
  // Still inside the tightened band after median-9: can't prove it helps → don't keep it.
  return { verdict: 'REVERT', delta, improved: false, regressions, reason: `|Δ| ${fmt(delta)} ≤ tightened ε ${fmt(epsOverall)} — unproven, reverting` };
}

function round(x) {
  return Math.round(x * 1e4) / 1e4;
}
function fmt(x) {
  return x.toFixed(4);
}
