import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideVerdict } from './check.mjs';

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
