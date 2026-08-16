import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundTree } from './gate.mjs';

const leaf = (metrics) => ({ tag: 'div', role: undefined, contractKey: null, ownText: '', sourceId: 'App.tsx:12:3', metrics, children: [] });

test('roundTree snaps gapTop to the eps grid so subpixel jitter cannot break convergence', () => {
  const rounded = roundTree(leaf({ gapTop: 1.7, widthRatio: 1 }), 1);
  assert.equal(rounded.metrics.gapTop, 2);

  const coarse = roundTree(leaf({ gapTop: 3.4, widthRatio: 1 }), 2);
  assert.equal(coarse.metrics.gapTop, 4);
});

test('roundTree quantizes widthRatio to three decimals', () => {
  const rounded = roundTree(leaf({ gapTop: 0, widthRatio: 0.3333333 }), 1);
  assert.equal(rounded.metrics.widthRatio, 0.333);
});

test('roundTree drops sourceId so an edit above an element cannot move the match', () => {
  const rounded = roundTree(leaf({ gapTop: 0, widthRatio: 1 }), 1);
  assert.equal('sourceId' in rounded, false);
});

test('roundTree recurses into children', () => {
  const parent = { ...leaf({ gapTop: 0, widthRatio: 1 }), children: [leaf({ gapTop: 5.9, widthRatio: 1 })] };
  const rounded = roundTree(parent, 1);
  assert.equal(rounded.children[0].metrics.gapTop, 6);
  assert.equal('sourceId' in rounded.children[0], false);
});
