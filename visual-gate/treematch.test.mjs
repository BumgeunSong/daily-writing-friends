// Synthetic before/after trees exercising treematch's failure matrix.
// Run: node --test visual-gate/treematch.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashTree, matchTrees } from './treematch.mjs';

const el = (tag, opts = {}, ...children) => ({
  tag,
  role: opts.role,
  contractKey: opts.key ?? null,
  sourceId: opts.sid,
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

test('indistinguishable twins changed DIFFERENTLY: ambiguous, not guessed', () => {
  const before = tree(card(''), card(''));
  const after = tree(card('', { gap: 6 }), card('', { gap: 10 }));
  const r = matchTrees(before, after);
  assert.equal(r.ambiguous.length, 2, 'divergent changes stay unattributable');
  assert.equal(r.changed.length, 0, 'no confident change reported');
});

test('indistinguishable twins changed IDENTICALLY: surfaced once, not swallowed as ambiguous', () => {
  // When every twin carries the same delta, positional pairing is moot — any
  // pairing yields the same change — so attribution ambiguity no longer applies.
  const before = tree(card(''), card(''));
  const after = tree(card('', { gap: 6 }), card('', { gap: 6 }));
  const r = matchTrees(before, after);
  assert.equal(r.ambiguous.length, 0, 'a uniform change across twins is attributable');
  assert.equal(r.changed.length, 1, 'surfaced once, not per-twin');
  assert.equal(r.changed[0].twinCount, 2, 'carries how many twins moved together');
  assert.match(r.changed[0].deltas.join(), /gapTop: 0 -> 6/);
});

test('twins with DIFFERENT content but the same change: still surfaced once (change identity, not content)', () => {
  // Real list rows carry different text; the uniform-change test must key on WHAT
  // changed (field, from→to, source), not the row's own content.
  const row = (text, sid, fs) => el('div', { sid }, el('span', { text, sid: 'Content.tsx:5:0', fs }));
  const before = tree(row('alice wrote this', 'Row.tsx:1:0', '16px'), row('bob wrote that', 'Row.tsx:1:0', '16px'));
  const after = tree(row('alice wrote this', 'Row.tsx:1:0', '14px'), row('bob wrote that', 'Row.tsx:1:0', '14px'));
  const r = matchTrees(before, after);
  assert.equal(r.ambiguous.length, 0, 'differing text must not split a uniform font change');
  assert.equal(r.changed.length, 1, 'surfaced once');
  assert.equal(r.changed[0].twinCount, 2);
  assert.match(r.changed[0].deltas.join(), /fontSize: 16px -> 14px/);
});

test('twin uniform-check keys on delta STRUCTURE, not a comma-joined string (no delimiter collision)', () => {
  // delta values carry commas (rgba, transform). Two genuinely different changes
  // must stay ambiguous; a naive join(',') would collide them into one "uniform".
  const d = (color, fs) => el('div', { color, fs });
  const before = tree(d('x', '16px'), d('x', '16px'));
  const after = tree(d('a', 'b,c'), d('a,fontSize: 16px -> b,c', '16px'));
  const r = matchTrees(before, after);
  assert.equal(r.ambiguous.length, 2, 'divergent twins must not collapse via a delimiter collision');
  assert.equal(r.changed.length, 0);
});

test('twins whose deep descendant changed identically: surfaced once from the depth', () => {
  const item = (childGap) => el('div', {}, el('span', { text: 'x', gap: childGap }));
  const before = tree(item(0), item(0));
  const after = tree(item(8), item(8));
  const r = matchTrees(before, after);
  assert.equal(r.ambiguous.length, 0);
  assert.equal(r.changed.length, 1, 'the identical deep delta surfaces once');
  assert.match(r.changed[0].node, /span/);
  assert.match(r.changed[0].deltas.join(), /gapTop: 0 -> 8/);
  assert.equal(r.changed[0].twinCount, 2);
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

test('delta carries node sourceId and ancestor sourceId chain for the judge', () => {
  const inner = (gap) => el('span', { text: 'x', sid: 'Row.tsx:9:2', gap });
  const row = (gap) => el('div', { sid: 'Row.tsx:5:0' }, inner(gap));
  const before = hashTree(el('section', { sid: 'List.tsx:3:0' }, row(0)));
  const after = hashTree(el('section', { sid: 'List.tsx:3:0' }, row(8)));
  const r = matchTrees(before, after);
  assert.equal(r.changed.length, 1);
  const d = r.changed[0];
  assert.equal(d.sourceId, 'Row.tsx:9:2', 'own sourceId travels with the delta');
  assert.deepEqual(d.ancestors, ['List.tsx:3:0', 'Row.tsx:5:0'], 'ancestor chain is root→parent sourceIds');
  assert.equal(d.kind, 'changed');
});

test('added/removed/moved deltas each carry a kind tag', () => {
  const before = hashTree(el('div', {}, el('h1', { text: 'a' }), el('h2', { text: 'b' })));
  const after = hashTree(el('div', {}, el('h2', { text: 'b' }), el('h1', { text: 'a' }), el('h3', { text: 'c' })));
  const r = matchTrees(before, after);
  assert.equal(r.added.length, 1);
  assert.equal(r.added[0].kind, 'added');
  assert.ok(r.moved.every((m) => m.kind === 'moved'));
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
