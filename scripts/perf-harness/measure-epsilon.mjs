// Measure ε — the noise floor of the `overall` F2 score (design §6).
//
// Re-measures the UNCHANGED baseline build N times against the frozen baseline.
// Identical code, so every `overall` should land near the baseline mean; the
// spread (std) of those readings IS ε — the band inside which the accept gate
// must not trust a delta. Also records per-route ε for the regression floor.
//
//   node scripts/perf-harness/measure-epsilon.mjs [--samples N]
//
// PROCESS ISOLATION: Lighthouse + Playwright leak native memory that V8's GC
// can't reclaim, so a single long-lived process climbs ~570MB/sample and dies
// with a FATAL heap-OOM around 7 samples (uncatchable — kills the process, so
// an in-process try/catch retry can't help). Instead each sample runs in its
// own short-lived child (`--single`): the child does ONE no-build measurement,
// prints its result, and exits — releasing all heap. A child that OOMs now exits
// non-zero, which the parent CATCHES and retries in a fresh process.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runMeasurement } from './lib/measure.mjs';
import { build } from './lib/server.mjs';
import { writeEpsilon } from './lib/ledger.mjs';
import { std, round } from './lib/stats.mjs';
import { paths } from './lib/config.mjs';

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const RESULT_PREFIX = '__EPS_RESULT__ ';

function loadBaselineOrExit() {
  if (!existsSync(paths.baselineFile)) {
    console.error('No baseline.json — run measure.mjs --set-baseline first.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(paths.baselineFile, 'utf8'));
}

// ---- child mode: one no-build measurement, emit JSON, exit (frees all heap) --
if (process.argv.includes('--single')) {
  const baseline = loadBaselineOrExit();
  const r = await runMeasurement({ doBuild: false, runs: 3, baseline });
  // Single delimited line on stdout — the parent greps for this; everything else
  // (auth logs, firebase noise) is ignored.
  process.stdout.write(`\n${RESULT_PREFIX}${JSON.stringify({ overall: r.overall, routeScores: r.routeScores })}\n`);
  process.exit(0);
}

// ---- parent mode: build once, spawn N isolated children, aggregate -----------
const samplesArg = process.argv.indexOf('--samples');
const SAMPLES = samplesArg >= 0 ? Number(process.argv[samplesArg + 1]) : 4;

loadBaselineOrExit();
const selfPath = fileURLToPath(import.meta.url);

console.log(`Building once, then measuring ε over ${SAMPLES} isolated median-3 child runs…\n`);
await build();

const overalls = [];
const perRoute = {};

// A flaky/OOM child must not abort the calibration: retry in a fresh process,
// capped at 2×SAMPLES attempts so a persistent failure still terminates.
const MAX_ATTEMPTS = SAMPLES * 2;
let collected = 0;
let attempt = 0;
while (collected < SAMPLES && attempt < MAX_ATTEMPTS) {
  attempt++;
  try {
    const out = execFileSync('node', [selfPath, '--single'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
      maxBuffer: 64 * 1024 * 1024,
    });
    const line = out.split('\n').find((l) => l.startsWith(RESULT_PREFIX));
    if (!line) throw new Error('child produced no result line');
    const r = JSON.parse(line.slice(RESULT_PREFIX.length));
    collected++;
    overalls.push(r.overall);
    for (const [k, score] of Object.entries(r.routeScores)) {
      (perRoute[k] ??= []).push(score);
    }
    console.log(`  run ${collected}/${SAMPLES}: overall=${r.overall.toFixed(4)}  [${Object.entries(r.routeScores).map(([k, s]) => `${k}=${s.toFixed(3)}`).join(' ')}]`);
  } catch (e) {
    console.warn(`  ⚠ sample attempt ${attempt} failed (${String(e.message).split('\n')[0]}) — retrying in fresh process`);
  }
}
if (collected < SAMPLES) {
  console.error(`\nGave up after ${attempt} attempts with only ${collected}/${SAMPLES} clean samples.`);
  process.exit(1);
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
