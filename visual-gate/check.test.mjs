import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { decideVerdict, waitForServer } from './check.mjs';

const row = (over) => ({ scenario: 's', env: 'E0', stable: true, violations: 0, reason: undefined, ...over });

test('decideVerdict fails only on a stably-judged env carrying violations', () => {
  const verdict = decideVerdict([row({ stable: true, violations: 2 })]);
  assert.equal(verdict.exitCode, 1);
  assert.equal(verdict.regressions.length, 1);
});

test('decideVerdict loud-passes an unjudged env even when it reports violations', () => {
  const verdict = decideVerdict([row({ stable: false, violations: 3, reason: 'no-convergence' })]);
  assert.equal(verdict.exitCode, 0);
  assert.equal(verdict.regressions.length, 0);
  assert.equal(verdict.unjudged.length, 1);
});

test('decideVerdict passes a clean, fully-judged matrix', () => {
  const verdict = decideVerdict([row({ env: 'E0' }), row({ env: 'E2' })]);
  assert.equal(verdict.exitCode, 0);
  assert.equal(verdict.regressions.length, 0);
  assert.equal(verdict.unjudged.length, 0);
});

test('decideVerdict fails on a real regression while still surfacing unjudged peers', () => {
  const verdict = decideVerdict([
    row({ env: 'E0', stable: true, violations: 1 }),
    row({ env: 'E2', stable: false, violations: 0, reason: 'no-vg-ready' }),
  ]);
  assert.equal(verdict.exitCode, 1);
  assert.equal(verdict.regressions.length, 1);
  assert.equal(verdict.unjudged.length, 1);
});

test('decideVerdict passes an empty matrix', () => {
  assert.equal(decideVerdict([]).exitCode, 0);
});

test('waitForServer bails immediately when the harness process has already exited', async () => {
  const dead = spawn(process.execPath, ['-e', 'process.exit(1)']);
  await new Promise((resolve) => dead.on('exit', resolve));

  const start = Date.now();
  const up = await waitForServer('http://127.0.0.1:1/', dead);
  const elapsedMs = Date.now() - start;

  assert.equal(up, false);
  assert.ok(elapsedMs < 1000, `expected an immediate bail, took ${elapsedMs}ms`);
});
