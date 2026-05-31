// CLI: measure Web Vitals across the frozen-fixture routes and print a report.
//
// Usage:
//   node scripts/perf-harness/measure.mjs [--build] [--runs N] [--route KEY] [--set-baseline]
//
// --build         rebuild the app first (vite build --mode local-supabase)
// --runs N        median-N per engine per route (default 3)
// --route KEY     measure a single route (root|boardFeed|postDetail|notifications)
// --set-baseline  write this run's Lighthouse medians as baseline.json

import { runMeasurement, applyScores, toBaseline, saveReport, writeBaseline } from './lib/measure.mjs';
import { printReport } from './lib/report.mjs';

function parseArgs(argv) {
  const a = { doBuild: false, setBaseline: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--build') a.doBuild = true;
    else if (t === '--set-baseline') a.setBaseline = true;
    else if (t === '--runs') a.runs = Number(argv[++i]);
    else if (t === '--route') a.routeKeys = [argv[++i]];
  }
  return a;
}

const args = parseArgs(process.argv);

const result = await runMeasurement({
  doBuild: args.doBuild,
  runs: args.runs,
  routeKeys: args.routeKeys,
});

const reportFile = saveReport(result, `${result.timestamp.replace(/[:.]/g, '-')}.json`);
saveReport(result, 'latest.json');

if (args.setBaseline) {
  const baseline = toBaseline(result);
  writeBaseline(baseline);
  // Re-score against the freshly written baseline so the report shows the true
  // floor (overall by definition), not a score against whatever baseline existed
  // before this run.
  applyScores(result, baseline);
  console.log('\nBaseline written to .perf-harness/baseline.json');
}

printReport(result);
console.log(`\nFull report: ${reportFile}`);
