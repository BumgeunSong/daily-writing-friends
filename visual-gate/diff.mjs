// Visual-gate B-layer: framework-neutral before/after tree diff for one env.
// Usage: node visual-gate/diff.mjs E0
//
// gate.mjs captures a DOM tree per env; this hashes both trees and reconciles
// them with the shared treematch module. A capture that did not
// converge is reported as "cannot judge", never as a regression.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hashTree, matchTrees } from './treematch.mjs';
import { buildTouchedFiles } from './touched.mjs';
import { judge, formatUnexplained } from './judge.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const reportsDir = path.resolve(here, 'reports');
const env = process.argv[2] || 'E0';

const load = (label) => JSON.parse(readFileSync(path.join(reportsDir, `${label}-${env}.json`), 'utf8'));

const before = load('before');
const after = load('after');

if (before.stable === false || after.stable === false) {
  console.log(`\n=== B-layer diff ${env}: SKIPPED — capture did not converge, gate cannot judge ===`);
  process.exit(0);
}

const r = matchTrees(hashTree(before.tree), hashTree(after.tree));

console.log(`\n=== B-layer diff ${env} (framework-neutral tree match) ===`);
console.log(
  `unchanged ${r.unchanged}, changed ${r.changed.length}, moved ${r.moved.length}, ` +
    `added ${r.added.length}, removed ${r.removed.length}, ambiguous ${r.ambiguous.length}`,
);
for (const c of r.changed.slice(0, 40)) console.log(`  changed   ${c.node}: ${c.deltas.join(' | ')}`);
for (const m of r.moved.slice(0, 20)) console.log(`  moved     ${m.node}`);
for (const a of r.added.slice(0, 20)) console.log(`  added     ${a.node}`);
for (const d of r.removed.slice(0, 20)) console.log(`  removed   ${d.node}`);
for (const q of r.ambiguous.slice(0, 20)) console.log(`  ambiguous ${q.node} (${q.note})`);

// Judgment: cross each delta against what this branch actually edited. If git is
// unavailable the touched set is empty, so every delta reads as unexplained — the
// safe over-flag direction (a miss is fatal, noise is not).
let touched;
try {
  touched = buildTouchedFiles();
} catch (e) {
  console.log(`\n[judge] no source diff (${String(e.message).split('\n')[0]}) — treating all deltas as unexplained`);
  touched = { hasLine: () => false, hasFile: () => false, size: 0 };
}
console.log(`\n=== judgment ${env} (git diff × sourceId) ===`);
console.log(formatUnexplained(judge({ report: r, touched })));
