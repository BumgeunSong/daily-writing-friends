// Visual-gate capture + A-layer runner (MVP).
// Usage:
//   node visual-gate/gate.mjs --label before --url "http://localhost:5199/visual-gate/index.html?component=commentInput"
// Writes reports/<label>-<envId>.json (layout + A-layer violations) and a PNG.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const reportsDir = path.resolve(here, 'reports');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

// A-layer runs on every env (no baseline needed); B-layer callers diff later.
// eps = per-env pixel tolerance. Chromium at integer DPR is subpixel-stable, so 1
// suffices; webkit (Phase 3) will want a looser gapTop tolerance. Applied at
// compare time (stability streak) and in the A-layer boundary checks, never baked
// into stored metrics — see roundTree / round-at-compare.
const ENVS = [
  { id: 'E0', width: 390, height: 844, colorScheme: 'light', dark: false, eps: 1 },
  { id: 'E1', width: 390, height: 844, colorScheme: 'dark', dark: true, eps: 1 },
  { id: 'E2', width: 320, height: 844, colorScheme: 'light', dark: false, eps: 1 },
  { id: 'E4', width: 1280, height: 900, colorScheme: 'light', dark: false, eps: 1 },
];

// ---- in-page: layout extraction + A-layer invariants (serialized to browser) ----
function inPage({ dark, eps }) {
  if (dark) document.documentElement.classList.add('dark');

  // No empty-root stub: a missing/collapsed gate root means we captured nothing
  // meaningful. Feeding a 1-node tree to the rules would silently pass. Signal
  // unjudgeable instead so the runner marks the env stable=false (loud-pass).
  const root = document.querySelector('[data-gate-root]');
  if (!root) return { noRoot: true, reason: 'no-gate-root' };
  const isVisible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const ownText = (el) => {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent;
    return t.trim().slice(0, 80);
  };
  // computed color serialization varies by browser/version; canonical rgba tuple.
  const rgba = (v) => {
    const n = (v.match(/[\d.]+/g) || []).map(Number);
    if (n.length < 3) return v;
    return `rgba(${n[0]},${n[1]},${n[2]},${n[3] ?? 1})`;
  };
  const contractKey = (el) => {
    const tid = el.getAttribute('data-testid');
    if (tid) return `tid:${tid}`;
    const role = el.getAttribute('role');
    const name = el.getAttribute('aria-label') || (role ? ownText(el) : '');
    return role && name ? `role:${role}:${name}` : null;
  };

  // Relational metrics only (absolute coords are the dominant noise source).
  const buildTree = (el, parentRect) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    let prevBottom = parentRect ? parentRect.top : r.top;
    for (let sib = el.previousElementSibling; sib; sib = sib.previousElementSibling) {
      if (isVisible(sib)) {
        prevBottom = sib.getBoundingClientRect().bottom;
        break;
      }
    }
    const children = [];
    for (const c of el.children) if (isVisible(c)) children.push(buildTree(c, r));
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || undefined,
      contractKey: contractKey(el),
      // Source coordinate stamped by componentDebugger. Report label only — it
      // shifts when code above it is edited, so it must never enter matching.
      sourceId: el.getAttribute('data-vg-id') || undefined,
      ownText: ownText(el),
      // Raw floats; rounding happens at compare time (roundTree) so stored
      // metrics stay full-precision for the B-layer diff and never double-round.
      metrics: {
        gapTop: r.top - prevBottom,
        widthRatio: parentRect && parentRect.width ? r.width / parentRect.width : 1,
        color: rgba(s.color),
        backgroundColor: rgba(s.backgroundColor),
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        position: s.position,
        textAlign: s.textAlign,
        boxShadow: s.boxShadow,
        borderWidth: `${s.borderTopWidth} ${s.borderRightWidth} ${s.borderBottomWidth} ${s.borderLeftWidth}`,
        borderColor: rgba(s.borderTopColor),
        borderRadius: s.borderRadius,
        transform: s.transform,
      },
      children,
    };
  };
  if (!isVisible(root)) return { noRoot: true, reason: 'gate-root-collapsed' };
  const domTree = buildTree(root, null);
  const all = [root, ...root.querySelectorAll('*')];

  // ---- A-layer invariants (five; #5 safe-area is env-dependent, stubbed) ----
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const violations = [];
  const scrollEl = document.scrollingElement || document.documentElement;

  // 1. horizontal overflow
  if (scrollEl.scrollWidth > scrollEl.clientWidth + eps) {
    violations.push({
      rule: 'horizontal-overflow',
      detail: `scrollWidth ${scrollEl.scrollWidth} > clientWidth ${scrollEl.clientWidth}`,
    });
  }

  // 2. interactive element outside viewport
  const interactive = [...root.querySelectorAll('button, a, input, textarea, select, [role="button"]')];
  for (const el of interactive) {
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + eps || r.left < -eps || r.bottom < 0 || r.top > vh) {
      violations.push({
        rule: 'interactive-outside-viewport',
        detail: `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" at [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}] vw=${vw} vh=${vh}`,
      });
    }
  }

  // 3. fixed-element overlap (exclude intentional overlays)
  const EXCLUDE = ['[role="dialog"]', '[role="tooltip"]', '[data-sonner-toaster]', '.sticky'];
  const fixed = [...document.querySelectorAll('*')].filter((el) => {
    if (getComputedStyle(el).position !== 'fixed' || !isVisible(el)) return false;
    return !EXCLUDE.some((sel) => el.matches(sel));
  });
  for (let i = 0; i < fixed.length; i++) {
    for (let j = i + 1; j < fixed.length; j++) {
      const a = fixed[i].getBoundingClientRect();
      const b = fixed[j].getBoundingClientRect();
      const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      if (overlap) {
        violations.push({
          rule: 'fixed-overlap',
          detail: `${fixed[i].tagName.toLowerCase()} overlaps ${fixed[j].tagName.toLowerCase()}`,
        });
      }
    }
  }

  // 4. clipped text
  for (const el of all) {
    if (!isVisible(el)) continue;
    const s = getComputedStyle(el);
    if ((s.overflow === 'hidden' || s.overflowY === 'hidden') && el.scrollHeight > el.clientHeight + eps * 2 && ownText(el)) {
      violations.push({
        rule: 'clipped-text',
        detail: `"${ownText(el)}" scrollH ${el.scrollHeight} > clientH ${el.clientHeight}`,
      });
    }
  }

  return { tree: domTree, violations, viewport: { vw, vh } };
}

function countNodes(n) {
  let c = 1;
  for (const ch of n.children || []) c += countNodes(ch);
  return c;
}

// Serialized into the page before any app script runs. Freezes the wall clock and
// RNG so relative timestamps ("3분 전") and random ids can't leak into ownText and
// manufacture run-to-run diffs. performance.now stays monotonic because React's
// scheduler reads it; the exact values never reach the DOM, so drift there is moot.
function freezeNondeterminism() {
  const FIXED_MS = 1735689600000; // 2025-01-01T00:00:00Z
  const RealDate = Date;
  class FrozenDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [FIXED_MS]));
    }
    static now() {
      return FIXED_MS;
    }
  }
  globalThis.Date = FrozenDate;
  Math.random = () => 0.5;
  if (globalThis.crypto) globalThis.crypto.randomUUID = () => '00000000-0000-4000-8000-000000000000';
  let t = 0;
  if (globalThis.performance) globalThis.performance.now = () => (t += 16);
}

// Round-at-compare projection: collapses subpixel float jitter to a stable key so
// the streak loop compares layout shape, not noise, and stored metrics stay
// full-precision for the later B-layer diff. sourceId is intentionally dropped —
// it shifts when code above an element is edited and must never enter matching.
function roundTree(node, eps) {
  const m = node.metrics || {};
  const rounded = { ...m };
  if (typeof m.gapTop === 'number') rounded.gapTop = Math.round(m.gapTop / eps) * eps;
  if (typeof m.widthRatio === 'number') rounded.widthRatio = Math.round(m.widthRatio * 1000) / 1000;
  return {
    tag: node.tag,
    role: node.role,
    contractKey: node.contractKey,
    ownText: node.ownText,
    metrics: rounded,
    children: (node.children || []).map((c) => roundTree(c, eps)),
  };
}

// Final-stop, not momentary-plateau: require STREAK consecutive identical reads
// before judging. A single rAF match can catch a skeleton→content mid-transition.
// noRoot (missing/collapsed gate root) is unjudgeable, not stable.
async function captureStable(page, env) {
  const STREAK = 3;
  const MAX = 12;
  const rAF2 = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const read = () => page.evaluate(inPage, { dark: env.dark, eps: env.eps });

  let result = await read();
  if (result.noRoot) return { result, stable: false };
  let key = JSON.stringify(roundTree(result.tree, env.eps));
  let streak = 1;
  for (let i = 0; i < MAX && streak < STREAK; i++) {
    await rAF2();
    const next = await read();
    if (next.noRoot) return { result: next, stable: false };
    const nextKey = JSON.stringify(roundTree(next.tree, env.eps));
    streak = nextKey === key ? streak + 1 : 1;
    key = nextKey;
    result = next;
  }
  return { result, stable: streak >= STREAK };
}

async function runScenario({ label, url }) {
  mkdirSync(reportsDir, { recursive: true });
  const browser = await chromium.launch();
  const summary = [];
  for (const env of ENVS) {
    const context = await browser.newContext({
      viewport: { width: env.width, height: env.height },
      colorScheme: env.colorScheme,
      deviceScaleFactor: 1, // integer DPR removes subpixel fractional jitter
      reducedMotion: 'reduce',
    });
    // Must run before any app script so the frozen clock/RNG are in place at import.
    await context.addInitScript(freezeNondeterminism);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // `load` + an explicit app-ready signal, not networkidle: the harness sets
    // data-vg-ready only after mount + fonts.ready, which is the real "painted".
    await page.goto(url, { waitUntil: 'load' });
    const ready = await page
      .waitForSelector('[data-vg-ready]', { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await page.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });

    const { result, stable } = await captureStable(page, env);
    const judged = stable && ready && !result.noRoot;
    const reason = result.noRoot ? result.reason : !ready ? 'no-vg-ready' : !stable ? 'no-convergence' : undefined;

    const outBase = path.join(reportsDir, `${label}-${env.id}`);
    writeFileSync(`${outBase}.json`, JSON.stringify({ env, url, stable: judged, reason, ...result, errors }, null, 2));
    await page.screenshot({ path: `${outBase}.png`, fullPage: true });
    summary.push({
      env: env.id,
      nodes: result.tree ? countNodes(result.tree) : 0,
      violations: result.violations ? result.violations.length : 0,
      pageErrors: errors.length,
      stable: judged,
      reason,
    });
    if (!judged) console.log(`  [!] ${env.id} unjudgeable (${reason}) — gate abstains (loud-pass)`);
    if (result.violations?.length) {
      for (const v of result.violations) console.log(`  [A] ${env.id} ${v.rule}: ${v.detail}`);
    }
    if (errors.length) for (const e of errors) console.log(`  [pageerror] ${env.id}: ${e.split('\n')[0]}`);
    await context.close();
  }
  await browser.close();
  console.log(
    `\n${label}: ` +
      summary.map((s) => `${s.env}(${s.nodes}n,${s.violations}v,${s.pageErrors}e${s.stable ? '' : ',UNSTABLE'})`).join('  '),
  );
  const unjudged = summary.filter((s) => !s.stable);
  if (unjudged.length) {
    // Surface abstentions by name+reason: "unstable = pass" silently eats coverage.
    console.log(`  unjudged ${unjudged.length}/${summary.length}: ${unjudged.map((s) => `${s.env}(${s.reason})`).join(', ')}`);
  }
  return summary;
}

export { inPage, roundTree, freezeNondeterminism, runScenario };

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  const label = arg('label', 'after');
  const url = arg('url', 'http://localhost:5199/visual-gate/index.html?component=commentInput');
  runScenario({ label, url }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
