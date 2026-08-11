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

const label = arg('label', 'after');
const url = arg('url', 'http://localhost:5199/visual-gate/index.html?component=commentInput');
// A-layer runs on every env (no baseline needed); B-layer callers diff later.
const ENVS = [
  { id: 'E0', width: 390, height: 844, colorScheme: 'light', dark: false },
  { id: 'E1', width: 390, height: 844, colorScheme: 'dark', dark: true },
  { id: 'E2', width: 320, height: 844, colorScheme: 'light', dark: false },
  { id: 'E4', width: 1280, height: 900, colorScheme: 'light', dark: false },
];

// ---- in-page: layout extraction + A-layer invariants (serialized to browser) ----
function inPage(darkClass) {
  if (darkClass) document.documentElement.classList.add('dark');

  const root = document.querySelector('[data-gate-root]') || document.body;
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
      ownText: ownText(el),
      metrics: {
        gapTop: Math.round(r.top - prevBottom),
        widthRatio: parentRect && parentRect.width ? Math.round((r.width / parentRect.width) * 1000) / 1000 : 1,
        color: rgba(s.color),
        backgroundColor: rgba(s.backgroundColor),
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        position: s.position,
      },
      children,
    };
  };
  const domTree = isVisible(root) ? buildTree(root, null) : { tag: 'div', metrics: {}, children: [] };
  const all = [root, ...root.querySelectorAll('*')];

  // ---- A-layer invariants (five; #5 safe-area is env-dependent, stubbed) ----
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const violations = [];
  const scrollEl = document.scrollingElement || document.documentElement;

  // 1. horizontal overflow
  if (scrollEl.scrollWidth > scrollEl.clientWidth + 1) {
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
    if (r.right > vw + 1 || r.left < -1 || r.bottom < 0 || r.top > vh) {
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
    if ((s.overflow === 'hidden' || s.overflowY === 'hidden') && el.scrollHeight > el.clientHeight + 2 && ownText(el)) {
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

async function run() {
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
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-gate-root]', { timeout: 5000 }).catch(() => {});
    await page.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    await page.evaluate(() => document.fonts && document.fonts.ready);

    // Convergence loop: re-extract until two reads agree, else flag (not a regression).
    const rAF2 = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    let result = await page.evaluate(inPage, env.dark);
    let stable = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      await rAF2();
      const next = await page.evaluate(inPage, env.dark);
      if (JSON.stringify(next.tree) === JSON.stringify(result.tree)) {
        stable = true;
        result = next;
        break;
      }
      result = next;
    }

    const outBase = path.join(reportsDir, `${label}-${env.id}`);
    writeFileSync(`${outBase}.json`, JSON.stringify({ env, url, stable, ...result, errors }, null, 2));
    await page.screenshot({ path: `${outBase}.png`, fullPage: true });
    summary.push({
      env: env.id,
      nodes: countNodes(result.tree),
      violations: result.violations.length,
      pageErrors: errors.length,
      stable,
    });
    if (!stable) console.log(`  [!] ${env.id} did not converge (nondeterministic render) — gate cannot judge`);
    if (result.violations.length) {
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
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
