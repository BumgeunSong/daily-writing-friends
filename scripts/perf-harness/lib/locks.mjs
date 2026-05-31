// Guardrail #3: the loop may edit APP CODE ONLY. The measurement harness, the
// scoring code, the seed fixture, and the loop state are off-limits — otherwise
// the LLM could "improve" the score by rewriting the ruler instead of the app.
// We enforce this by diffing the working tree against HEAD and rejecting any
// iteration that touches a locked path.

import { execFileSync } from 'node:child_process';
import { paths } from './config.mjs';

// Path prefixes (repo-relative) the loop must never modify.
export const LOCKED_PREFIXES = [
  'scripts/perf-harness/', // the harness + scoring (the ruler)
  'scripts/seed-perf-fixture.ts', // the frozen fixture seed
  'tests/fixtures/perf-fixture.json', // the generated fixture manifest
  '.perf-harness/', // baseline, reports, ledger (loop state)
  'docs/plans/2026-05-31-web-vitals-loop-design.md', // the locked design
];

function git(args) {
  return execFileSync('git', args, { cwd: paths.repoRoot, encoding: 'utf8' });
}

/** All paths changed vs HEAD: modified, staged, and untracked. */
export function changedPaths() {
  const out = git(['status', '--porcelain', '--untracked-files=all']);
  return out
    .split('\n')
    .filter(Boolean)
    .map((l) => l.slice(3).trim()) // strip the 2-char status + space
    .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p)); // renames
}

function isLocked(path) {
  return LOCKED_PREFIXES.some((p) => (p.endsWith('/') ? path.startsWith(p) : path === p));
}

/** Returns { ok, violations } — ok=false means a locked path was touched. */
export function checkLocks() {
  const violations = changedPaths().filter(isLocked);
  return { ok: violations.length === 0, violations };
}
