// The judgment cross: explained vs unexplained, with the two narrowings the
// 5-angle review forced in (line-range required, ancestor cascade reflow-only).
// Run: node --test visual-gate/judge.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { judge, isExplained } from './judge.mjs';

// A touched stub: files is a Map<file, Set<line>>; hasLine/hasFile match by suffix
// the same way the real touchedFiles does, so tests read like real sourceIds.
const touchedStub = (spec) => {
  const files = new Map(Object.entries(spec).map(([f, lines]) => [f, new Set(lines)]));
  const find = (sid) => {
    const m = (sid || '').match(/^(.*):(\d+):\d+$/);
    if (!m) return null;
    for (const [f, lines] of files) if (f === m[1] || f.endsWith('/' + m[1])) return { lines, line: Number(m[2]) };
    return null;
  };
  return {
    hasFile: (sid) => find(sid) !== null,
    hasLine: (sid) => {
      const r = find(sid);
      return r ? r.lines.has(r.line) : false;
    },
  };
};

const delta = (kind, sourceId, ancestors, deltas) => ({ kind, node: `${kind}@${sourceId}`, sourceId, ancestors, deltas });

test('own line edited → explained', () => {
  const t = touchedStub({ 'Btn.tsx': [44] });
  assert.equal(isExplained(delta('changed', 'Btn.tsx:44:6', [], ['color: a -> b']), t), true);
});

test('own line untouched, no ancestor touched → unexplained (the regression fingerprint)', () => {
  const t = touchedStub({ 'Other.tsx': [10] });
  assert.equal(isExplained(delta('moved', 'Btn.tsx:44:6', ['List.tsx:3:0']), t), false);
});

test('touched ancestor + reflow delta → explained (legitimate cascade)', () => {
  const t = touchedStub({ 'List.tsx': [3] });
  assert.equal(isExplained(delta('moved', 'Btn.tsx:44:6', ['List.tsx:3:0']), t), true, 'moved is reflow');
  assert.equal(
    isExplained(delta('changed', 'Btn.tsx:44:6', ['List.tsx:3:0'], ['gapTop: 0 -> 8']), t),
    true,
    'gapTop-only is reflow',
  );
});

test('touched ancestor + color change → still unexplained (cascade must not amnesty recolor)', () => {
  const t = touchedStub({ 'List.tsx': [3] });
  assert.equal(
    isExplained(delta('changed', 'Btn.tsx:44:6', ['List.tsx:3:0'], ['color: rgba(0,0,0,1) -> rgba(255,0,0,1)']), t),
    false,
    'an ancestor edit reflows a child, it does not recolor it',
  );
});

test('touched ancestor + mixed reflow-and-color delta → unexplained (any non-reflow field taints it)', () => {
  const t = touchedStub({ 'List.tsx': [3] });
  assert.equal(
    isExplained(delta('changed', 'Btn.tsx:44:6', ['List.tsx:3:0'], ['gapTop: 0 -> 8', 'color: a -> b']), t),
    false,
  );
});

test('touched ancestor + added/removed node → unexplained (structural, not reflow)', () => {
  const t = touchedStub({ 'List.tsx': [3] });
  assert.equal(isExplained(delta('added', 'Btn.tsx:44:6', ['List.tsx:3:0']), t), false);
  assert.equal(isExplained(delta('removed', 'Btn.tsx:44:6', ['List.tsx:3:0']), t), false);
});

test('judge partitions a report and keeps ambiguous in its own bucket', () => {
  const t = touchedStub({ 'Btn.tsx': [44] });
  const report = {
    changed: [delta('changed', 'Btn.tsx:44:6', [], ['color: a -> b'])], // explained
    moved: [delta('moved', 'Ghost.tsx:9:0', ['Root.tsx:1:0'])], // unexplained
    added: [],
    removed: [],
    ambiguous: [{ kind: 'ambiguous', node: 'twin', note: 'indistinguishable sibling changed' }],
  };
  const r = judge({ report, touched: t });
  assert.equal(r.explained.length, 1);
  assert.equal(r.unexplained.length, 1);
  assert.equal(r.unexplained[0].sourceId, 'Ghost.tsx:9:0');
  assert.equal(r.ambiguous.length, 1, 'ambiguous never counted as explained or unexplained');
});
