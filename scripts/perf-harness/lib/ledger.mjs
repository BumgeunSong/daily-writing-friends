// Loop state: the running record the driver reads/writes across iterations.
//   best.json     — best-so-far overall + per-route scores (the regression floor)
//   ledger.jsonl  — append-only history of every iteration's verdict
//   epsilon.json  — empirically measured noise floor of `overall` at baseline
// All live under .perf-harness/ (gitignored) so they persist between sessions
// without polluting the repo.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { paths } from './config.mjs';

function ensureDir() {
  mkdirSync(paths.reportsDir, { recursive: true });
}

function readJSON(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

/** Best-so-far snapshot: { overall, routeScores, metrics, iter, timestamp }. */
export function readBest() {
  return readJSON(paths.bestFile);
}

export function writeBest(best) {
  ensureDir();
  writeFileSync(paths.bestFile, JSON.stringify(best, null, 2));
}

/** Empirically measured noise floor: { epsilon, samples, overalls, measuredAt }. */
export function readEpsilon() {
  return readJSON(paths.epsilonFile);
}

export function writeEpsilon(eps) {
  ensureDir();
  writeFileSync(paths.epsilonFile, JSON.stringify(eps, null, 2));
}

/** Append one iteration record; returns the record with its assigned iter number. */
export function appendLedger(entry) {
  ensureDir();
  const iter = readLedger().length + 1;
  const record = { iter, timestamp: new Date().toISOString(), ...entry };
  appendFileSync(paths.ledgerFile, JSON.stringify(record) + '\n');
  return record;
}

/** All ledger records in order. */
export function readLedger() {
  if (!existsSync(paths.ledgerFile)) return [];
  return readFileSync(paths.ledgerFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

/** Consecutive accepted iterations with no meaningful overall gain (stagnation count). */
export function stagnationStreak() {
  const ledger = readLedger();
  let streak = 0;
  for (let i = ledger.length - 1; i >= 0; i--) {
    if (ledger[i].verdict === 'ACCEPT' && ledger[i].improved) break;
    streak++;
  }
  return streak;
}
