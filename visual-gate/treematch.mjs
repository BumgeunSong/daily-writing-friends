// DOM treematch: framework-neutral, deterministic before/after element matching
// over a captured DOM tree (visual-gate B-layer). No React fiber dependency.
//
// Per matched parent, sibling lists are reconciled by:
//   1. exactHash prefix/suffix trim  — identical subtrees at the ends are pruned
//      (an inserted/removed sibling no longer shifts the rest; the killer case).
//   2. contract key                  — data-testid / role+name, when unique 1:1.
//   3. shapeHash anchor              — a shape unique on both sides pairs across
//      any reorder (patience-diff anchor, generalized to "unique shape").
//   4. same-shape group, positional  — deterministic order tiebreak; a change
//      among indistinguishable twins is reported ambiguous, not guessed.
// Matching identity (tag/role/contractKey/shapeHash/text) is kept separate from
// measured metrics, so a legitimate style change never breaks the pairing.

// ---- hashing: bottom-up exact (merkle) + shape ----

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(36);
}

const METRIC_FIELDS = ['gapTop', 'widthRatio', 'color', 'backgroundColor', 'fontSize', 'fontWeight', 'position'];

function canonicalMetrics(m) {
  return METRIC_FIELDS.map((f) => {
    const v = m?.[f];
    return typeof v === 'number' ? v.toFixed(2) : String(v ?? '');
  }).join('|');
}

// Fills shapeHash + exactHash on every node of a raw tree, bottom-up, and returns it.
// A raw node is { tag, role?, contractKey?, ownText?, metrics, children? }.
export function hashTree(node) {
  const children = node.children ?? [];
  for (const c of children) hashTree(c);
  const role = node.role ?? '';
  node.shapeHash = fnv1a(`${node.tag}|${role}|[${children.map((c) => c.shapeHash).join(',')}]`);
  node.exactHash = fnv1a(
    `${node.tag}|${role}|${node.contractKey ?? ''}|${node.ownText ?? ''}|${canonicalMetrics(node.metrics)}|` +
      `[${children.map((c) => c.exactHash).join(',')}]`,
  );
  return node;
}

// ---- metric deltas (comparison is looser than storage: per-field epsilon) ----

const EPS = { gapTop: 1, widthRatio: 0.02, w: 1, h: 1 };

// Returns [{ field, text }] rather than bare strings: the judge decides reflow-ness
// from field NAMES, and reconstructing them by splitting the display string on ':'
// is a fragile cross-module contract (a value containing ':' would misparse). The
// field travels structurally; text stays for human-readable output.
function metricDeltas(b, a) {
  const out = [];
  for (const f of METRIC_FIELDS) {
    const bv = b.metrics?.[f];
    const av = a.metrics?.[f];
    if (typeof bv === 'number' && typeof av === 'number') {
      if (Math.abs(bv - av) > (EPS[f] ?? 1)) out.push({ field: f, text: `${f}: ${bv} -> ${av}` });
    } else if (bv !== av) {
      out.push({ field: f, text: `${f}: ${bv} -> ${av}` });
    }
  }
  if ((b.ownText ?? '') !== (a.ownText ?? '')) {
    out.push({ field: 'text', text: `text: "${b.ownText ?? ''}" -> "${a.ownText ?? ''}"` });
  }
  return out;
}

// sourceId is descriptive only: it names the source location of a reported node
// but never participates in hashing or pairing (see hashTree / matchChildren).
const label = (n) =>
  `${n.tag}${n.ownText ? ` "${n.ownText.slice(0, 24)}"` : ''}${n.sourceId ? ` @${n.sourceId}` : ''}`;

// A reported delta carries, alongside its human label, the machine-readable
// identity the judge crosses against git diff: the node's own sourceId and the
// sourceId chain of its ancestors (root→parent). Matching never uses these — they
// exist only so the judge can ask "did the author touch this line, or an ancestor
// file that legitimately reflows it?" ancestors is a plain string[] of sourceIds
// (some entries undefined for library/SVG nodes without data-vg-id).
const entry = (n, ancestors, extra) => ({
  node: label(n),
  sourceId: n.sourceId,
  ancestors: ancestors.map((a) => a.sourceId),
  ...extra,
});

// ---- longest strictly-increasing subsequence: returns the set of kept indices ----

function lisKeptSet(seq) {
  const n = seq.length;
  if (n === 0) return new Set();
  const tails = []; // value = index into seq
  const prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (seq[tails[mid]] < seq[i]) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const kept = new Set();
  let k = tails[tails.length - 1];
  while (k !== -1) {
    kept.add(k);
    k = prev[k];
  }
  return kept;
}

// ---- sibling reconciliation ----

function pushMap(map, key, val) {
  const arr = map.get(key);
  if (arr) arr.push(val);
  else map.set(key, [val]);
}

// Key builders for the unique-pairing passes. Text and shape include tag so a
// button and a div sharing text/structure never collapse together.
const kExact = (nd) => nd.exactHash;
const kContract = (nd) => nd.contractKey || '';
const kText = (nd) => (nd.ownText ? `${nd.tag}#${nd.ownText}` : '');
const kShape = (nd) => nd.shapeHash;

// Returns { pairs:[[bi,ai]], removed:[bi], added:[ai], ambiguous:[[bi,ai]] }.
function matchChildren(B, A) {
  const n = B.length;
  const m = A.length;
  const mb = new Array(n).fill(false);
  const ma = new Array(m).fill(false);
  const pairs = [];
  const ambiguous = [];

  // 1. exactHash prefix / suffix trim (position-anchored fast path + prune)
  let i = 0;
  let j = 0;
  while (i < n && j < m && B[i].exactHash === A[j].exactHash) {
    pairs.push([i, j]);
    mb[i] = ma[j] = true;
    i++;
    j++;
  }
  let e = n - 1;
  let f = m - 1;
  while (e >= i && f >= j && !mb[e] && !ma[f] && B[e].exactHash === A[f].exactHash) {
    pairs.push([e, f]);
    mb[e] = ma[f] = true;
    e--;
    f--;
  }

  const remB = () => B.map((_, k) => k).filter((k) => !mb[k]);
  const remA = () => A.map((_, k) => k).filter((k) => !ma[k]);

  // 2. pair by keys that are unique on BOTH sides, from strongest to weakest.
  //    exact = identical subtree that moved; contract = data-testid/role;
  //    text  = same element with changed metrics; shape = structural anchor.
  const pairUnique = (keyFn) => {
    const bEntry = new Map();
    const aEntry = new Map();
    for (const k of remB()) {
      const key = keyFn(B[k]);
      if (!key) continue;
      const e0 = bEntry.get(key);
      if (e0) e0.count++;
      else bEntry.set(key, { count: 1, idx: k });
    }
    for (const k of remA()) {
      const key = keyFn(A[k]);
      if (!key) continue;
      const e0 = aEntry.get(key);
      if (e0) e0.count++;
      else aEntry.set(key, { count: 1, idx: k });
    }
    for (const [key, be] of bEntry) {
      if (be.count !== 1) continue;
      const ae = aEntry.get(key);
      if (ae && ae.count === 1) {
        pairs.push([be.idx, ae.idx]);
        mb[be.idx] = ma[ae.idx] = true;
      }
    }
  };
  pairUnique(kExact);
  pairUnique(kContract);
  pairUnique(kText);
  pairUnique(kShape);

  // 3. residue: same-shape indistinguishable twins. Positional (deterministic),
  //    but a change among them cannot be safely attributed → ambiguous.
  const groupA = new Map();
  for (const k of remA()) pushMap(groupA, A[k].shapeHash, k);
  const groupB = new Map();
  for (const k of remB()) pushMap(groupB, B[k].shapeHash, k);
  for (const [sh, bs] of groupB) {
    const as = groupA.get(sh);
    if (!as) continue;
    const c = Math.min(bs.length, as.length);
    for (let t = 0; t < c; t++) {
      const bi = bs[t];
      const ai = as[t];
      pairs.push([bi, ai]);
      mb[bi] = ma[ai] = true;
      if (B[bi].exactHash !== A[ai].exactHash) ambiguous.push([bi, ai]);
    }
  }

  return { pairs, removed: remB(), added: remA(), ambiguous };
}

// ---- tree walk: accumulate a flat report ----

export function matchTrees(before, after) {
  return buildReport(before, after);
}

// A report's CHANGE identity, ignoring positional index, ancestor chain, and the
// node's own content: twins with different text that changed the same way (same
// field, same from→to, same source location) must produce the same signature.
// Keying on the node label would embed per-row text and wrongly split them.
function reportSignature(rep) {
  // JSON-encode each entry (deltas stays a nested array) rather than joining on a
  // delimiter: a delta value can contain that delimiter (rgba/transform hold ','),
  // and a flattened string would collide distinct delta sets into one signature.
  const proj = (buckets) => buckets.map((e) => JSON.stringify([e.kind, e.sourceId ?? '', e.deltas ?? []])).sort();
  return JSON.stringify([proj(rep.changed), proj(rep.moved), proj(rep.added), proj(rep.removed), proj(rep.ambiguous)]);
}

function hasDelta(rep) {
  return rep.changed.length + rep.moved.length + rep.added.length + rep.removed.length + rep.ambiguous.length > 0;
}

function buildReport(before, after) {
  const report = { unchanged: 0, changed: [], moved: [], added: [], removed: [], ambiguous: [] };
  const ambiguousKey = new Set();

  // bAnc/aAnc are the ancestor chains (root→parent) on the before and after side,
  // threaded down so each reported delta can name what legitimately reflows it.
  const walkPair = (b, a, bAnc, aAnc) => {
    if (b.exactHash === a.exactHash) {
      report.unchanged += 1 + countDescendants(b);
      return;
    }
    const parts = metricDeltas(b, a);
    if (parts.length) {
      report.changed.push(entry(b, bAnc, { kind: 'changed', deltas: parts.map((p) => p.text), fields: parts.map((p) => p.field) }));
    }
    reconcile(b.children ?? [], a.children ?? [], [...bAnc, b], [...aAnc, a]);
  };

  // A same-shape twin whose exactHash differs can't be attributed to a specific
  // sibling — UNLESS every twin in its group changed identically, in which case the
  // pairing is moot (any pairing yields the same delta) and the change is safe to
  // surface once. Divergent twins stay ambiguous. Twins share sourceIds (same
  // component rendered N times), so one representative's coordinates are correct.
  const resolveAmbiguous = (ambiguous, B, A, bAnc) => {
    for (const [bi, ai] of ambiguous) ambiguousKey.add(bi + ':' + ai);
    const groups = new Map();
    for (const [bi, ai] of ambiguous) {
      const sh = B[bi].shapeHash;
      if (!groups.has(sh)) groups.set(sh, []);
      groups.get(sh).push([bi, ai]);
    }
    const prefix = bAnc.map((n) => n.sourceId);
    for (const [, grp] of groups) {
      const subs = grp.map(([bi, ai]) => ({ bi, rep: buildReport(B[bi], A[ai]) }));
      const sigs = subs.map((s) => reportSignature(s.rep));
      const uniform = hasDelta(subs[0].rep) && sigs.every((s) => s === sigs[0]);
      if (uniform) {
        mergeLifted(report, subs[0].rep, prefix, grp.length);
      } else {
        for (const { bi } of subs) {
          report.ambiguous.push(entry(B[bi], bAnc, { kind: 'ambiguous', note: 'indistinguishable sibling changed' }));
        }
      }
    }
  };

  const reconcile = (B, A, bAnc, aAnc) => {
    const { pairs, removed, added, ambiguous } = matchChildren(B, A);
    resolveAmbiguous(ambiguous, B, A, bAnc);
    // moved = paired children not on the LIS of after-index (in before order)
    const ordered = pairs.filter(([bi, ai]) => !ambiguousKey.has(bi + ':' + ai)).sort((p, q) => p[0] - q[0]);
    const kept = lisKeptSet(ordered.map(([, ai]) => ai));
    ordered.forEach(([bi, ai], idx) => {
      if (!kept.has(idx)) report.moved.push(entry(B[bi], bAnc, { kind: 'moved' }));
    });
    for (const [bi, ai] of pairs) {
      if (ambiguousKey.has(bi + ':' + ai)) continue;
      walkPair(B[bi], A[ai], bAnc, aAnc);
    }
    for (const bi of removed) report.removed.push(entry(B[bi], bAnc, { kind: 'removed' }));
    for (const ai of added) report.added.push(entry(A[ai], aAnc, { kind: 'added' }));
  };

  walkPair(before, after, [], []);
  return report;
}

// Splices a representative twin's sub-report into the parent report: prefixes the
// real ancestor chain above the twin (the sub-walk started at the twin as root) and
// stamps twinCount so a reader knows N rows moved together, not one.
function mergeLifted(report, sub, prefix, twinCount) {
  const lift = (e) => ({ ...e, ancestors: [...prefix, ...e.ancestors], twinCount });
  for (const e of sub.changed) report.changed.push(lift(e));
  for (const e of sub.moved) report.moved.push(lift(e));
  for (const e of sub.added) report.added.push(lift(e));
  for (const e of sub.removed) report.removed.push(lift(e));
  for (const e of sub.ambiguous) report.ambiguous.push({ ...e, ancestors: [...prefix, ...e.ancestors] });
  report.unchanged += sub.unchanged;
}

function countDescendants(n) {
  let c = 0;
  for (const ch of n.children ?? []) c += 1 + countDescendants(ch);
  return c;
}
