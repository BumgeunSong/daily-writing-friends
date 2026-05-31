// Orchestrator: median-N Lighthouse (outer reward) + web-vitals (inner cross-check)
// across all fixture routes, normalized into the F2 score with a Lighthouse-vs-
// web-vitals agreement tripwire. Importable by the loop driver and runnable as a CLI.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { build, startPreview } from './server.mjs';
import { authenticate } from './auth.mjs';
import { measureLighthouse } from './measure-lh.mjs';
import { measureWebVitals } from './measure-wv.mjs';
import { scoreRoute, scoreOverall } from './scoring.mjs';
import { median, round } from './stats.mjs';
import { loadRoutes, MEDIAN_RUNS, paths } from './config.mjs';

/** Median across runs for each metric key (ignores null/failed reads). */
function medianMetrics(runs, keys) {
  const out = {};
  for (const k of keys) {
    const vals = runs.map((r) => r[k]).filter((v) => typeof v === 'number');
    out[k] = vals.length ? median(vals) : null;
  }
  return out;
}

/** WV-real / LH-simulate ratio for a timing metric (informational regime gap). */
function ratio(real, sim) {
  if (!(real > 0) || !(sim > 0)) return null;
  return round(real / sim, 2);
}

function loadBaseline() {
  return existsSync(paths.baselineFile)
    ? JSON.parse(readFileSync(paths.baselineFile, 'utf8'))
    : null;
}

/**
 * Run a full measurement.
 * @param opts.doBuild   rebuild before serving (default false — caller controls)
 * @param opts.runs      median runs per engine per route
 * @param opts.routeKeys subset of route keys to measure (default all)
 * @param opts.baseline  per-route baseline metrics; falls back to baseline.json
 */
export async function runMeasurement(opts = {}) {
  const runs = opts.runs ?? MEDIAN_RUNS;
  const allRoutes = loadRoutes();
  const routes = opts.routeKeys
    ? allRoutes.filter((r) => opts.routeKeys.includes(r.key))
    : allRoutes;
  const baseline = opts.baseline ?? loadBaseline();

  if (opts.doBuild) await build();

  const session = await authenticate();
  const { origin, stop } = await startPreview();

  const perRoute = {};
  try {
    for (const route of routes) {
      const lhRuns = [];
      const wvRuns = [];
      for (let i = 0; i < runs; i++) {
        lhRuns.push(await measureLighthouse(origin, route.path, session));
        wvRuns.push(await measureWebVitals(origin, route.path, session, route.key));
      }
      const lh = medianMetrics(lhRuns, ['lcp', 'fcp', 'cls', 'tbt', 'si']);
      lh.score = median(lhRuns.map((r) => r.score));
      const wv = medianMetrics(wvRuns, ['lcp', 'fcp', 'cls', 'ttfb']);

      perRoute[route.key] = {
        path: route.path,
        traffic: route.traffic,
        lighthouse: lh,
        webVitals: wv,
        // CLS is the only absolute cross-check: both engines see the same DOM,
        // so it must match (clsDelta ~0). FCP/LCP diverge systematically because
        // LH simulates (Lantern) while WV observes real wall-clock — that gap is
        // expected, so we record the regime ratio for insight, not as a tripwire.
        // The real reward-hack signal (LH improves but WV doesn't) is directional
        // and lives in the loop driver, which diffs WV across iterations.
        agreement: {
          clsDelta: round(Math.abs((lh.cls ?? 0) - (wv.cls ?? 0)), 3),
          lcpRatio: ratio(wv.lcp, lh.lcp),
          fcpRatio: ratio(wv.fcp, lh.fcp),
        },
        lhRuns,
        wvRuns,
      };
    }
  } finally {
    await stop();
  }

  const result = {
    timestamp: new Date().toISOString(),
    runs,
    hasBaseline: !!baseline,
    routes: perRoute,
  };
  return applyScores(result, baseline);
}

/**
 * Compute F2 from the web-vitals (real-throttled) medians — the reward the loop
 * climbs. Lighthouse-simulate is the cross-check, not the score, because its
 * Lantern model reports the app as already passing the "good" thresholds
 * (saturated baseline) while real wall-clock still has the headroom.
 *
 * Pure with respect to measurement: scoring is just arithmetic on already-
 * measured metrics, so callers can re-score the same result against a different
 * baseline (e.g. a fresh --set-baseline run scoring against itself).
 */
export function applyScores(result, baseline) {
  const routeScores = {};
  for (const [key, r] of Object.entries(result.routes)) {
    if (baseline?.[key]) {
      const scored = scoreRoute(
        { lcp: r.webVitals.lcp, fcp: r.webVitals.fcp, cls: r.webVitals.cls },
        baseline[key],
      );
      r.routeScore = scored.score;
      r.sub = scored.sub;
      routeScores[key] = scored.score;
    }
  }
  result.routeScores = routeScores;
  result.overall =
    Object.keys(routeScores).length === Object.keys(result.routes).length
      ? scoreOverall(routeScores)
      : null;
  return result;
}

/** Per-route web-vitals (real-throttled) medians, shaped for baseline.json. */
export function toBaseline(result) {
  const out = {};
  for (const [key, r] of Object.entries(result.routes)) {
    out[key] = { lcp: r.webVitals.lcp, fcp: r.webVitals.fcp, cls: r.webVitals.cls };
  }
  return out;
}

export function saveReport(result, name) {
  mkdirSync(paths.reportsDir, { recursive: true });
  const file = `${paths.reportsDir}/${name}`;
  writeFileSync(file, JSON.stringify(result, null, 2));
  return file;
}

export function writeBaseline(baseline) {
  mkdirSync(paths.reportsDir, { recursive: true });
  writeFileSync(paths.baselineFile, JSON.stringify(baseline, null, 2));
}
