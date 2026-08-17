// The judgment cross (prototype). One question per delta:
//   "does the author's code change explain this DOM change?"
// Both halves are machine-read: touchedFiles from git diff, sourceId from the DOM
// capture. A delta the author touched is explained (intent); one nobody touched is
// the fingerprint of a regression — action at a distance that type-check and unit
// tests never see.
//
// This is the prototype stop: it partitions explained/unexplained and attributes
// each to source. No tier, no exit code, no differential A-layer yet — those are
// the finished-version's atomic commits, gated on this proving value on a real
// regression.

// A touched ancestor can legitimately reflow a child (edit a flex container → its
// children shift). It cannot recolor, resize the font of, or respace that child.
// So the cascade only forgives positional deltas; color/font/spacing under a
// touched ancestor stays unexplained. Without this narrowing, one container-file
// edit amnesties every regression in its whole subtree — the exact hole that lets
// action-at-a-distance through, which is the one thing this gate exists to catch.
const REFLOW_METRICS = new Set(['gapTop', 'widthRatio']);

function isReflowShaped(delta) {
  if (delta.kind === 'moved') return true;
  if (delta.kind === 'changed') {
    return delta.deltas.length > 0 && delta.deltas.every((d) => REFLOW_METRICS.has(d.split(':')[0]));
  }
  return false; // added / removed are structural — never reflow-excused
}

// explained = the node's own source line was edited (hasLine, required — file-only
// is too coarse when one file emits many nodes), OR an ancestor file was edited AND
// this delta is merely a reflow of that edit.
export function isExplained(delta, touched) {
  if (touched.hasLine(delta.sourceId)) return true;
  const ancestorTouched = (delta.ancestors || []).some((sid) => touched.hasFile(sid));
  return ancestorTouched && isReflowShaped(delta);
}

export function judge({ report, touched }) {
  const deltas = [...report.changed, ...report.moved, ...report.added, ...report.removed];
  const explained = [];
  const unexplained = [];
  for (const d of deltas) (isExplained(d, touched) ? explained : unexplained).push(d);
  // ambiguous stays its own bucket: the matcher gave up attribution, so the judge
  // must not pretend to. Reported as "cannot attribute", never as a regression.
  return { explained, unexplained, ambiguous: report.ambiguous ?? [] };
}

function why(delta) {
  const own = delta.sourceId ?? 'no-source-id';
  const anc = (delta.ancestors || []).filter(Boolean);
  return `${delta.kind} ${delta.node}\n      source ${own}, ancestors [${anc.join(', ')}] — no author edit explains it`;
}

export function formatUnexplained(result) {
  const lines = [];
  lines.push(
    `judgment: ${result.explained.length} explained, ${result.unexplained.length} unexplained, ` +
      `${result.ambiguous.length} unattributable`,
  );
  for (const d of result.unexplained) lines.push(`  [unexplained] ${why(d)}`);
  for (const a of result.ambiguous) lines.push(`  [unattributable] ${a.kind ?? 'ambiguous'} ${a.node} (${a.note ?? ''})`);
  return lines.join('\n');
}
