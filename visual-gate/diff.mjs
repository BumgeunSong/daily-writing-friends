// Visual-gate B-layer: diff before/after layout JSON for one env.
// Usage: node visual-gate/diff.mjs E0
//
// Identity is the structural path (posKey): unique per element, so unchanged
// elements pair 1:1 and never collapse. A secondary own-text pass re-pairs a
// relocated text element so a move is not double-counted as remove+add.
//
// The earlier contentKey strategy (tag + hash of the element's *descendant*
// textContent) bucketed every empty element under one key "tag#0" and kept only
// the first, so it mispaired a container with a nested child and reported
// phantom deltas (e.g. h 122->90) whenever the subtree gained a node. The
// "pick whichever strategy changed fewer" heuristic then preferred exactly that
// collapsed, wrong pairing. Both are removed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const reportsDir = path.resolve(here, 'reports');
const env = process.argv[2] || 'E0';

const load = (label) =>
  JSON.parse(readFileSync(path.join(reportsDir, `${label}-${env}.json`), 'utf8'));

const before = load('before');
const after = load('after');

const FIELDS = ['dx', 'gap', 'w', 'h', 'color', 'backgroundColor', 'fontSize', 'fontWeight', 'position'];

function deltasFor(br, ar) {
  const deltas = [];
  for (const f of FIELDS) {
    if (br[f] === ar[f]) continue;
    if (typeof br[f] === 'number' && Math.abs(br[f] - ar[f]) < 2) continue; // sub-2px noise
    deltas.push(`${f}: ${br[f]} -> ${ar[f]}`);
  }
  return deltas;
}

function indexBy(records, keyFn) {
  const m = new Map();
  for (const r of records) {
    const k = keyFn(r);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, r);
  }
  return m;
}

const afterByPos = indexBy(after.records, (r) => r.posKey);

const changed = [];
let matched = 0;
const consumedAfter = new Set();
const unmatchedBefore = [];

// Primary pass: match by structural path.
for (const br of before.records) {
  const ar = afterByPos.get(br.posKey);
  if (!ar || consumedAfter.has(br.posKey)) {
    unmatchedBefore.push(br);
    continue;
  }
  matched++;
  consumedAfter.add(br.posKey);
  const deltas = deltasFor(br, ar);
  if (deltas.length) changed.push({ tag: br.tag, text: br.text || ar.text, deltas });
}

// Secondary pass: re-pair a moved element by its own (non-empty) text.
const movedText = indexBy(
  [...afterByPos.values()].filter((r) => !consumedAfter.has(r.posKey) && r.text),
  (r) => `${r.tag}#${r.text}`,
);
const removed = [];
for (const br of unmatchedBefore) {
  const ar = br.text ? movedText.get(`${br.tag}#${br.text}`) : undefined;
  if (!ar) {
    removed.push(br);
    continue;
  }
  matched++;
  consumedAfter.add(ar.posKey);
  const deltas = deltasFor(br, ar);
  if (deltas.length) changed.push({ tag: br.tag, text: br.text, deltas, moved: true });
}

const added = [...afterByPos.values()].filter((r) => !consumedAfter.has(r.posKey));

console.log(`\n=== B-layer diff ${env} (key: posKey + text-move fallback) ===`);
console.log(`matched ${matched}, changed ${changed.length}, added ${added.length}, removed ${removed.length}`);
for (const c of changed.slice(0, 40)) {
  console.log(
    `  ${c.tag}${c.text ? ` "${c.text.slice(0, 30)}"` : ''}${c.moved ? ' [moved]' : ''}: ${c.deltas.join(' | ')}`,
  );
}
if (changed.length > 40) console.log(`  ... +${changed.length - 40} more`);
