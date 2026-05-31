// Measure ε — the noise floor of the `overall` F2 score (design §6).
//
// Re-measures the UNCHANGED baseline build N times against the frozen baseline.
// Identical code, so every `overall` should land near the baseline floor; the
// spread (std) of those readings IS ε — the band inside which the accept gate
// must not trust a delta. Also records per-route ε for the regression floor.
//
//   node scripts/perf-harness/measure-epsilon.mjs [--samples N]

import { existsSync, readFileSync } from 'node:fs';
import { runMeasurement } from './lib/measure.mjs';
import { writeEpsilon } from './lib/ledger.mjs';
import { std, round } from './lib/stats.mjs';
import { paths } from './lib/config.mjs';

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

const samplesArg = process.argv.indexOf('--samples');
const SAMPLES = samplesArg >= 0 ? Number(process.argv[samplesArg + 1]) : 4;

if (!existsSync(paths.baselineFile)) {
  console.error('No baseline.json — run measure.mjs --set-baseline first.');
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(paths.baselineFile, 'utf8'));

const overalls = [];
const perRoute = {};
console.log(`Measuring ε over ${SAMPLES} median-3 runs of the unchanged baseline…\n`);
for (let i = 0; i < SAMPLES; i++) {
  const r = await runMeasurement({ doBuild: i === 0, runs: 3, baseline });
  overalls.push(r.overall);
  for (const [k, score] of Object.entries(r.routeScores)) {
    (perRoute[k] ??= []).push(score);
  }
  console.log(`  run ${i + 1}/${SAMPLES}: overall=${r.overall.toFixed(4)}  [${Object.entries(r.routeScores).map(([k, s]) => `${k}=${s.toFixed(3)}`).join(' ')}]`);
}

const routes = {};
const routeMeans = {};
for (const [k, arr] of Object.entries(perRoute)) {
  routes[k] = round(std(arr), 4);
  routeMeans[k] = round(mean(arr), 4);
}

const eps = {
  overall: round(std(overalls), 4),
  routes,
  // Expected (mean) score of the unchanged code. Per-route scores clamp downside
  // noise at the floor, so scoreRoute(baseline,baseline) is the MIN, not the
  // center — best.json must be seeded HERE so a no-op centers at Δ≈0 (loop init
  // reads these means).
  means: { overall: round(mean(overalls), 4), routes: routeMeans },
  samples: SAMPLES,
  overalls: overalls.map((x) => round(x, 4)),
  measuredAt: new Date().toISOString(),
};
writeEpsilon(eps);

console.log(`\nε(overall) = ${eps.overall}  (std of ${SAMPLES} baseline re-measures)`);
console.log(`ε(per-route) = ${Object.entries(routes).map(([k, e]) => `${k}=${e}`).join(' ')}`);
console.log(`expected overall = ${eps.means.overall}  (mean — best.json seed)`);
console.log(`Written to .perf-harness/epsilon.json`);
