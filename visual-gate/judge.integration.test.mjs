// End-to-end judgment over the REAL pipeline: hashTree → matchTrees → judge, with a
// REAL parseTouched(diff) as the author-edit half. The unit tests hand-build deltas
// and a touched stub, so they can pass while the treematch→judge delta shape or the
// parseTouched path-matching silently drifts. This test wires the actual modules
// together so that drift fails here. Run: node --test visual-gate/judge.integration.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { hashTree, matchTrees } from './treematch.mjs';
import { parseTouched } from './touched.mjs';
import { judge } from './judge.mjs';

// A raw capture node as gate.mjs emits it (pre-hash). Only the metric fields
// treematch compares need to be present.
const node = (tag, sourceId, metrics, ownText = '', children = []) => ({
  tag,
  role: undefined,
  contractKey: null,
  sourceId,
  ownText,
  metrics: { gapTop: 0, widthRatio: 1, color: 'rgba(0,0,0,1)', backgroundColor: 'rgba(255,255,255,1)', fontSize: '16px', fontWeight: '400', position: 'static', ...metrics },
  children,
});

const CA = 'src/comment/components/CommentActions.tsx';
const CL = 'src/comment/components/CommentList.tsx';

const diffTouching = (gitPath, line) =>
  `--- a/${gitPath}\n+++ b/${gitPath}\n@@ -${line} +${line} @@\n-  old\n+  new\n`;

const reportFor = (before, after) => matchTrees(hashTree(before), hashTree(after));

test('real pipeline: author recolored the button on its own line → explained', () => {
  const before = node('div', `${CL}:32:4`, {}, '', [node('button', `${CA}:44:6`, { color: 'rgba(37,99,235,1)' }, '등록')]);
  const after = node('div', `${CL}:32:4`, {}, '', [node('button', `${CA}:44:6`, { color: 'rgba(124,58,237,1)' }, '등록')]);
  const touched = parseTouched(diffTouching(`apps/web/${CA}`, 44));
  const r = judge({ report: reportFor(before, after), touched });
  assert.equal(r.unexplained.length, 0, 'the edited line explains its own color change');
  assert.equal(r.explained.length, 1);
  assert.equal(r.explained[0].fields?.[0], 'color', 'structured field survives the real matchTrees round-trip');
});

test('real pipeline: button recolored but author touched only an unrelated file → unexplained (regression fingerprint)', () => {
  const before = node('div', `${CL}:32:4`, {}, '', [node('button', `${CA}:44:6`, { color: 'rgba(37,99,235,1)' }, '등록')]);
  const after = node('div', `${CL}:32:4`, {}, '', [node('button', `${CA}:44:6`, { color: 'rgba(124,58,237,1)' }, '등록')]);
  const touched = parseTouched(diffTouching('apps/web/src/comment/components/MentionableInput.tsx', 10));
  const r = judge({ report: reportFor(before, after), touched });
  assert.equal(r.unexplained.length, 1);
  assert.equal(r.unexplained[0].sourceId, `${CA}:44:6`, 'the regression is attributed to the untouched button');
});

test('real pipeline: container line edited, child merely shifts → reflow cascade explains it', () => {
  const before = node('div', `${CL}:32:4`, {}, '', [node('button', `${CA}:44:6`, { gapTop: 0 }, '등록')]);
  const after = node('div', `${CL}:32:4`, { gapTop: 4 }, '', [node('button', `${CA}:44:6`, { gapTop: 20 }, '등록')]);
  const touched = parseTouched(diffTouching(`apps/web/${CL}`, 32));
  const r = judge({ report: reportFor(before, after), touched });
  assert.equal(r.unexplained.length, 0, 'a gapTop-only shift under the touched container is reflow');
});

test('real pipeline: node without sourceId changes under an untouched tree → unexplained, no crash', () => {
  const before = node('div', `${CL}:32:4`, {}, '', [node('span', undefined, { color: 'rgba(0,0,0,1)' }, 'x')]);
  const after = node('div', `${CL}:32:4`, {}, '', [node('span', undefined, { color: 'rgba(255,0,0,1)' }, 'x')]);
  const touched = parseTouched(diffTouching('apps/web/src/comment/components/MentionableInput.tsx', 10));
  const r = judge({ report: reportFor(before, after), touched });
  assert.equal(r.unexplained.length, 1, 'a sourceId-less change is never silently explained away');
  assert.equal(r.unexplained[0].sourceId, undefined);
});
