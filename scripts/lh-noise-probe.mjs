// Lighthouse noise characterization probe.
// Runs Lighthouse N times against a target URL (mobile + simulated throttling),
// collects the performance score + key metric values, then reports run-to-run
// variance and the stability of median-of-3 vs median-of-5 aggregation.
//
// Usage: node scripts/lh-noise-probe.mjs <url> [measuredRuns]
// Requires: npx lighthouse (downloaded on first use), system Chrome.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'https://dailywritingfriends.com/';
const measuredRuns = Number(process.argv[3] || 10);
const warmupRuns = 1;

const workDir = mkdtempSync(join(tmpdir(), 'lh-noise-'));

function runLighthouse(label) {
  const outPath = join(workDir, `lh-${label}.json`);
  execFileSync(
    'npx',
    [
      '-y',
      'lighthouse',
      url,
      '--only-categories=performance',
      '--form-factor=mobile',
      '--throttling-method=simulate',
      '--output=json',
      `--output-path=${outPath}`,
      '--quiet',
      '--chrome-flags=--headless=new --no-sandbox',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'], timeout: 120_000 },
  );
  const lhr = JSON.parse(readFileSync(outPath, 'utf8'));
  const a = lhr.audits;
  return {
    score: Math.round(lhr.categories.performance.score * 100),
    fcp: Math.round(a['first-contentful-paint'].numericValue),
    lcp: Math.round(a['largest-contentful-paint'].numericValue),
    tbt: Math.round(a['total-blocking-time'].numericValue),
    cls: Math.round((a['cumulative-layout-shift'].numericValue) * 1000) / 1000,
    si: Math.round(a['speed-index'].numericValue),
  };
}

function stats(arr) {
  const sorted = [...arr].sort((x, y) => x - y);
  const n = sorted.length;
  const mean = arr.reduce((s, x) => s + x, 0) / n;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0], mean: Math.round(mean * 100) / 100, std: Math.round(std * 100) / 100, median };
}

function median(arr) {
  const s = [...arr].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

// Bootstrap: how stable is median-of-k sampling from the observed distribution?
function medianOfKStability(scores, k, trials = 5000) {
  const medians = [];
  for (let t = 0; t < trials; t++) {
    const sample = [];
    for (let i = 0; i < k; i++) sample.push(scores[Math.floor(Math.random() * scores.length)]);
    medians.push(median(sample));
  }
  return stats(medians);
}

console.log(`\n=== Lighthouse noise probe ===`);
console.log(`URL: ${url}`);
console.log(`Profile: mobile + simulated throttling`);
console.log(`Warmup: ${warmupRuns}, Measured: ${measuredRuns}\n`);

for (let i = 0; i < warmupRuns; i++) {
  process.stdout.write(`warmup ${i + 1}/${warmupRuns}... `);
  runLighthouse(`warmup-${i}`);
  console.log('done');
}

const results = [];
for (let i = 0; i < measuredRuns; i++) {
  process.stdout.write(`run ${i + 1}/${measuredRuns}... `);
  const r = runLighthouse(`m-${i}`);
  results.push(r);
  console.log(`score=${r.score} fcp=${r.fcp} lcp=${r.lcp} tbt=${r.tbt} cls=${r.cls} si=${r.si}`);
}

const scores = results.map((r) => r.score);
console.log(`\n--- Performance score (0-100) distribution over ${measuredRuns} runs ---`);
console.log(stats(scores));

console.log(`\n--- Per-metric distribution ---`);
for (const key of ['fcp', 'lcp', 'tbt', 'cls', 'si']) {
  console.log(`${key.toUpperCase().padEnd(4)}:`, stats(results.map((r) => r[key])));
}

console.log(`\n--- Aggregation stability (bootstrap 5000 trials on observed scores) ---`);
const m3 = medianOfKStability(scores, 3);
const m5 = medianOfKStability(scores, 5);
console.log(`median-of-3: std=${m3.std}, range=${m3.range} (min=${m3.min}, max=${m3.max})`);
console.log(`median-of-5: std=${m5.std}, range=${m5.range} (min=${m5.min}, max=${m5.max})`);
console.log(`\nInterpretation: lower std = more stable reward signal. Compare against your floor-gate epsilon.`);

rmSync(workDir, { recursive: true, force: true });
console.log(`\nRaw results JSON:`);
console.log(JSON.stringify(results));
