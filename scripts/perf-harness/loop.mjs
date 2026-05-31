// Loop driver — the harness the LLM operates each iteration.
//
//   node scripts/perf-harness/loop.mjs status
//       Print the feedback report: best-so-far vs baseline, per-route gradient
//       (which metric on which route still has headroom), recent ledger, and
//       stop-condition status. This is what the LLM reads to pick ONE change.
//
//   node scripts/perf-harness/loop.mjs eval --note "what I changed"
//       Score the current working tree against best-so-far and decide.
//       Pipeline: lock check (#3) → build+measure (functional gate #2) →
//       accept gate B (re-measure on the margin) → regression floor + cross-check
//       → commit (ACCEPT) or revert (REVERT) → append ledger → stop check.
//
//   node scripts/perf-harness/loop.mjs init
//       Seed best.json from the current baseline (overall 0, routes at baseline).
//
// The loop edits APP CODE ONLY; everything under scripts/perf-harness/ is locked.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  paths,
  TARGETS,
  STAGNATION_LIMIT,
  TARGET_OVERALL,
  loadRoutes,
} from './lib/config.mjs';
import { runMeasurement } from './lib/measure.mjs';
import { scoreRoute, scoreOverall } from './lib/scoring.mjs';
import { decideGate } from './lib/gate.mjs';
import { crossCheck } from './lib/xcheck.mjs';
import { checkLocks } from './lib/locks.mjs';
import {
  readBest,
  writeBest,
  readEpsilon,
  appendLedger,
  readLedger,
  stagnationStreak,
} from './lib/ledger.mjs';

const ROUTE_LABEL = {
  root: '/ (→/boards)',
  boardFeed: '/board/*',
  postDetail: '/board/*/post/*',
  notifications: '/notifications',
};

function git(args) {
  return execFileSync('git', args, { cwd: paths.repoRoot, encoding: 'utf8' });
}
function loadBaseline() {
  if (!existsSync(paths.baselineFile)) throw new Error('No baseline.json — run measure.mjs --set-baseline first.');
  return JSON.parse(readFileSync(paths.baselineFile, 'utf8'));
}

// Build the best-so-far snapshot from a measurement result + raw metrics.
function snapshot(result) {
  const metrics = {};
  for (const [key, r] of Object.entries(result.routes)) {
    metrics[key] = {
      wv: { lcp: r.webVitals.lcp, fcp: r.webVitals.fcp, cls: r.webVitals.cls },
      lh: { lcp: r.lighthouse.lcp, fcp: r.lighthouse.fcp, cls: r.lighthouse.cls, perf: r.lighthouse.score },
    };
  }
  return { overall: result.overall, routeScores: result.routeScores, metrics };
}

// ---- commands ---------------------------------------------------------------

function cmdInit() {
  const baseline = loadBaseline();
  const routeScores = {};
  for (const [key, m] of Object.entries(baseline)) {
    routeScores[key] = scoreRoute(m, m).score; // current==baseline → score 0 where headroom exists
  }
  const best = {
    overall: scoreOverall(routeScores),
    routeScores,
    metrics: Object.fromEntries(Object.entries(baseline).map(([k, m]) => [k, { wv: m, lh: null }])),
    iter: 0,
    note: 'baseline',
  };
  writeBest(best);
  console.log(`best.json seeded from baseline — overall=${best.overall.toFixed(4)}`);
  for (const r of loadRoutes()) {
    console.log(`  ${(ROUTE_LABEL[r.key] ?? r.key).padEnd(16)} route_score=${routeScores[r.key].toFixed(4)}`);
  }
}

function cmdStatus() {
  const baseline = loadBaseline();
  const best = readBest();
  const eps = readEpsilon();
  if (!best) return console.log('No best.json yet — run: loop.mjs init');

  const line = '─'.repeat(72);
  console.log(`\n${line}\nFEEDBACK REPORT  (reward = web-vitals real-throttled)\n${line}`);
  console.log(`overall best = ${best.overall.toFixed(4)}   target = ${TARGET_OVERALL}   ε = ${eps ? eps.overall.toFixed(4) : 'unmeasured'}`);
  console.log('\nPer-route gradient (where the headroom is — lower raw ms = better):');
  for (const r of loadRoutes()) {
    const m = best.metrics[r.key]?.wv ?? baseline[r.key];
    const sub = scoreRoute(m, baseline[r.key]).sub;
    const head = (metric, value, t) =>
      value > t ? `${metric} ${Math.round(value)}→${t}ms (s=${sub[metric].s.toFixed(2)})` : `${metric} ✓`;
    console.log(
      `  ${(ROUTE_LABEL[r.key] ?? r.key).padEnd(16)} traffic=${String(r.traffic).padStart(4)}  ` +
        `${head('lcp', m.lcp, TARGETS.lcp)}  ${head('fcp', m.fcp, TARGETS.fcp)}  ` +
        `${r.key && m.cls > TARGETS.cls ? `cls ${m.cls.toFixed(3)}→${TARGETS.cls}` : 'cls ✓'}`,
    );
  }

  const ledger = readLedger();
  console.log(`\nRecent iterations (${ledger.length} total):`);
  for (const e of ledger.slice(-8)) {
    console.log(`  #${String(e.iter).padStart(3)} ${e.verdict.padEnd(7)} Δ${(e.delta ?? 0).toFixed(4)}  ${e.note ?? ''}`);
  }
  const streak = stagnationStreak();
  console.log(`\nStop check: stagnation ${streak}/${STAGNATION_LIMIT}` + (best.overall >= TARGET_OVERALL ? '  | TARGET REACHED' : ''));
  console.log(line);
}

async function measureOnce(runs) {
  return runMeasurement({ doBuild: true, runs });
}

async function cmdEval(note) {
  const best = readBest();
  const eps = readEpsilon();
  if (!best) throw new Error('No best.json — run: loop.mjs init');
  if (!eps) throw new Error('No epsilon.json — run: loop.mjs measure-epsilon');

  // Guardrail #3 — locked paths.
  const locks = checkLocks();
  if (!locks.ok) {
    appendLedger({ verdict: 'VOID', delta: 0, improved: false, note, reason: `locked paths touched: ${locks.violations.join(', ')}` });
    console.log(`VOID — iteration touched locked files:\n  ${locks.violations.join('\n  ')}`);
    return finish(best);
  }

  // Guardrail #2 — functional gate is enforced inside runMeasurement (ready.mjs throws).
  let current;
  try {
    current = await measureOnce(3);
  } catch (e) {
    appendLedger({ verdict: 'VOID', delta: 0, improved: false, note, reason: `measurement failed (page not ready?): ${String(e.message).split('\n')[0]}` });
    console.log(`VOID — measurement failed: ${String(e.message).split('\n')[0]}`);
    return finish(best);
  }

  // Accept gate B.
  let decision = decideGate(current, best, eps, false);
  if (decision.verdict === 'REMEASURE') {
    console.log(`  margin (${decision.reason}) — re-measuring median-9…`);
    current = await measureOnce(9);
    decision = decideGate(current, best, eps, true);
  }

  // Guardrail #1 — cross-check (CLS match + LH-simulate didn't diverge from the WV gain).
  const xc = crossCheck(snapshot(current), best);
  if (decision.verdict === 'ACCEPT' && !xc.ok) {
    decision = { ...decision, verdict: 'REVERT', improved: false, reason: `cross-check failed: ${xc.flags.join('; ')}` };
  }

  const rec = appendLedger({
    verdict: decision.verdict,
    delta: decision.delta,
    improved: decision.improved,
    note,
    reason: decision.reason,
    overall: current.overall,
    routeScores: current.routeScores,
    xcheck: xc.flags,
  });

  if (decision.verdict === 'ACCEPT') {
    writeBest({ ...snapshot(current), iter: rec.iter, note });
    git(['add', '-A', '--', 'apps', 'packages']);
    git(['commit', '-m', `perf(loop #${rec.iter}): ${note}\n\noverall ${best.overall.toFixed(4)} → ${current.overall.toFixed(4)} (Δ${decision.delta.toFixed(4)})`]);
    console.log(`ACCEPT (#${rec.iter}) — ${decision.reason}. overall → ${current.overall.toFixed(4)}. Committed.`);
  } else {
    revertAppChanges();
    console.log(`${decision.verdict} (#${rec.iter}) — ${decision.reason}. App changes reverted.`);
  }
  finish(decision.verdict === 'ACCEPT' ? snapshot(current) : best);
}

// Surgical revert: restore tracked app files, drop new untracked app files.
// Never touches locked harness/state (they're committed or gitignored).
function revertAppChanges() {
  git(['checkout', '--', 'apps', 'packages']);
  git(['clean', '-fd', '--', 'apps', 'packages']);
}

function finish(best) {
  const streak = stagnationStreak();
  if (best.overall >= TARGET_OVERALL) {
    console.log(`\n🎯 STOP — target overall ${TARGET_OVERALL} reached (${best.overall.toFixed(4)}).`);
  } else if (streak >= STAGNATION_LIMIT) {
    console.log(`\n🛑 STOP — ${streak} iterations without meaningful improvement (limit ${STAGNATION_LIMIT}).`);
  } else {
    console.log(`Continue: stagnation ${streak}/${STAGNATION_LIMIT}, overall ${best.overall.toFixed(4)}/${TARGET_OVERALL}.`);
  }
}

// ---- dispatch ---------------------------------------------------------------

const [cmd, ...rest] = process.argv.slice(2);
const noteIdx = rest.indexOf('--note');
const note = noteIdx >= 0 ? rest[noteIdx + 1] : '(no note)';

switch (cmd) {
  case 'init':
    cmdInit();
    break;
  case 'status':
    cmdStatus();
    break;
  case 'eval':
    await cmdEval(note);
    break;
  default:
    console.log('usage: loop.mjs <init|status|eval --note "...">');
    process.exit(1);
}
