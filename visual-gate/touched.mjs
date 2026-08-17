// The author-edit half of the judgment cross: which source lines this branch
// touched. The judge asks, per changed DOM node, "did the author touch this?" —
// hasLine (file + line range) for the node's own attribution, hasFile (file only)
// for the ancestor-cascade fallback.
//
// Scope is fixed as "everything this branch changed": merge-base(origin/main)→HEAD
// plus the working tree (git diff <merge-base>, no second ref). A drifting scope
// (staged vs unstaged vs branch) would silently change which regressions count as
// explained, and a wider self-reported scope is exactly what this design refuses.
import { spawnSync } from 'node:child_process';

const HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;

// sourceId is file:line:col (last two segments numeric); file may itself hold no
// colon on posix, so peel the two trailing numbers off the right.
export function parseSourceId(sourceId) {
  if (!sourceId) return null;
  const m = /^(.*):(\d+):(\d+)$/.exec(sourceId);
  if (!m) return null;
  return { file: m[1], line: Number(m[2]), col: Number(m[3]) };
}

// sourceId files are app-src-relative (src/...); git paths are repo-relative
// (apps/web/src/...). The git path is the longer one, so it ends with the
// sourceId file. Equality covers the same-root case.
function pathMatches(gitPath, sidFile) {
  return gitPath === sidFile || gitPath.endsWith('/' + sidFile);
}

// Parses a `git diff --unified=0` body into new-side touched line ranges per file.
// With zero context every hunk's +range is exactly the added/changed lines, so a
// range naturally spans a multi-line edit. Pure: takes diff text, runs no process.
export function parseTouched(diffText) {
  const files = new Map(); // gitPath -> Array<[start, end]>
  let current = null;
  for (const raw of diffText.split('\n')) {
    if (raw.startsWith('+++ ')) {
      const p = raw.slice(4).replace(/^b\//, '').trim();
      current = p === '/dev/null' ? null : p;
      if (current && !files.has(current)) files.set(current, []);
      continue;
    }
    const h = HUNK.exec(raw);
    if (h && current) {
      const start = Number(h[1]);
      const span = h[2] === undefined ? 1 : Number(h[2]);
      if (span > 0) files.get(current).push([start, start + span - 1]);
    }
  }
  return makeTouchedFiles(files);
}

function makeTouchedFiles(files) {
  const rangesFor = (sidFile) => {
    for (const [gitPath, ranges] of files) if (pathMatches(gitPath, sidFile)) return ranges;
    return null;
  };
  return {
    files,
    size: files.size,
    hasFile(sourceId) {
      const s = parseSourceId(sourceId);
      return s ? rangesFor(s.file) !== null : false;
    },
    hasLine(sourceId) {
      const s = parseSourceId(sourceId);
      if (!s) return false;
      const ranges = rangesFor(s.file);
      return ranges ? ranges.some(([lo, hi]) => s.line >= lo && s.line <= hi) : false;
    },
  };
}

export function buildTouchedFiles({ baseRef = 'origin/main', cwd } = {}) {
  const run = (args) => {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr || r.error}`);
    return r.stdout;
  };
  const base = run(['merge-base', baseRef, 'HEAD']).trim();
  return parseTouched(run(['diff', '--unified=0', base]));
}
