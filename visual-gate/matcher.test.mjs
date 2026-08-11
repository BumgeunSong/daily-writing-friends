// Synthetic before/after trees exercising the matcher's failure matrix.
// Run: node --test visual-gate/matcher.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashTree, matchTrees } from './matcher.mjs';

const el = (tag, opts = {}, ...children) => ({
  tag,
  role: opts.role,
  contractKey: opts.key ?? null,
  ownText: opts.text ?? '',
  metrics: {
    gapTop: opts.gap ?? 0,
    widthRatio: opts.wr ?? 1,
    color: opts.color ?? 'rgb(0,0,0)',
    backgroundColor: 'rgb(255,255,255)',
    fontSize: opts.fs ?? '16px',
    fontWeight: '400',
    position: 'static',
  },
  children,
});
const tree = (...children) => hashTree(el('div', {}, ...children));
const card = (text, extra = {}) => el('div', { text, ...extra });

test('sibling inserted at front + one sibling changed: no misattribution', () => {
  const before = tree(card('alice'), card('bob'));
  const after = tree(card('zoe'), card('alice'), card('bob', { gap: 8 }));
  const r = matchTrees(before, after);
  assert.equal(r.added.length, 1, 'zoe added');
  assert.equal(r.removed.length, 0);
  assert.equal(r.ambiguous.length, 0);
  assert.equal(r.changed.length, 1, 'only bob changed');
  assert.match(r.changed[0].node, /bob/);
  assert.match(r.changed[0].deltas.join(), /gapTop: 0 -> 8/);
});

test('sibling deleted: reported as removed, no phantom deltas', () => {
  const before = tree(el('h1', { text: 'a' }), el('h2', { text: 'b' }), el('h3', { text: 'c' }));
  const after = tree(el('h1', { text: 'a' }), el('h3', { text: 'c' }));
  const r = matchTrees(before, after);
  assert.equal(r.removed.length, 1);
  assert.match(r.removed[0].node, /b/);
  assert.equal(r.added.length, 0);
  assert.equal(r.changed.length, 0);
});

test('reorder: folded into moved, not a delta storm', () => {
  const before = tree(el('h1', { text: 'a' }), el('h2', { text: 'b' }), el('h3', { text: 'c' }));
  const after = tree(el('h3', { text: 'c' }), el('h1', { text: 'a' }), el('h2', { text: 'b' }));
  const r = matchTrees(before, after);
  assert.equal(r.moved.length, 1, 'one element moved');
  assert.match(r.moved[0].node, /c/);
  assert.equal(r.changed.length, 0);
  assert.equal(r.added.length, 0);
  assert.equal(r.removed.length, 0);
});

test('text edit: same element stays matched (no ancestor-hash pollution)', () => {
  const before = tree(card('hello world'));
  const after = tree(card('hello there'));
  const r = matchTrees(before, after);
  assert.equal(r.changed.length, 1);
  assert.equal(r.added.length, 0);
  assert.equal(r.removed.length, 0);
  assert.match(r.changed[0].deltas.join(), /text:/);
});

test('genuine style regression: attributed to the exact element', () => {
  const before = tree(card('x', { gap: 0 }));
  const after = tree(card('x', { gap: 12 }));
  const r = matchTrees(before, after);
  assert.equal(r.changed.length, 1);
  assert.match(r.changed[0].node, /x/);
  assert.match(r.changed[0].deltas.join(), /gapTop: 0 -> 12/);
});

test('indistinguishable twins both changed: ambiguous, not guessed', () => {
  const before = tree(card(''), card(''));
  const after = tree(card('', { gap: 6 }), card('', { gap: 10 }));
  const r = matchTrees(before, after);
  assert.equal(r.ambiguous.length, 2, 'both twins ambiguous');
  assert.equal(r.changed.length, 0, 'no confident change reported');
});

test('no change: deterministic zero, whole tree pruned as unchanged', () => {
  const before = tree(card('a'), card('b'));
  const after = tree(card('a'), card('b'));
  const r = matchTrees(before, after);
  assert.equal(r.changed.length, 0);
  assert.equal(r.added.length, 0);
  assert.equal(r.removed.length, 0);
  assert.equal(r.moved.length, 0);
  assert.equal(r.ambiguous.length, 0);
  assert.ok(r.unchanged > 0);
});

test('deep change under one list item: sibling item untouched', () => {
  const item = (text, childGap) => el('div', { text }, el('span', { text: 'x', gap: childGap }));
  const before = tree(item('a', 0), item('b', 0));
  const after = tree(item('a', 8), item('b', 0));
  const r = matchTrees(before, after);
  assert.equal(r.changed.length, 1, 'only the inner span of item a changed');
  assert.match(r.changed[0].node, /span/);
  assert.match(r.changed[0].deltas.join(), /gapTop: 0 -> 8/);
  assert.equal(r.added.length, 0);
  assert.equal(r.removed.length, 0);
  assert.equal(r.ambiguous.length, 0);
});
