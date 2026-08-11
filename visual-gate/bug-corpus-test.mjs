// Bug-corpus test: reproduce the signature of real DWF visual-regression commits
// that are genuinely in scope for a DOM-property diff, and measure catch.
// Excluded by design: scroll/nav timing (E2E), loading/error state (integration),
// editor/IME (E2E+manual), design judgment (no ground truth).
// The safe-area case is included to show it is *invisible* off-device — an honest
// boundary, not a pass. Run: node visual-gate/bug-corpus-test.mjs [url]
import { chromium } from '@playwright/test';
import { inPage } from './gate.mjs';
import { hashTree, matchTrees } from './matcher.mjs';

const URL = process.argv[2] || 'http://localhost:5200/visual-gate/index.html?component=mentionable';
const KILL = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

const CASES = [
  {
    id: 'c998950383',
    name: '긴 텍스트 → 모바일 가로 스크롤',
    width: 390,
    base: '',
    mut: '[data-gate-root]::after{content:"";display:block;width:520px;height:2px;background:#ccc}',
    expect: 'catch',
  },
  {
    id: '0675b3a023',
    name: 'CTA 반응형 깨짐 (320 오버플로)',
    width: 320,
    base: '',
    mut: '[data-gate-root] button{min-width:380px!important}',
    expect: 'catch',
  },
  {
    id: '9ded7b466f',
    name: 'Toaster 고정 위치 오프셋 오류',
    width: 390,
    base: '',
    mut: '',
    toastBefore: 16,
    toastAfter: 72,
    expect: 'catch',
  },
  {
    id: '64ec9dfa33',
    name: 'PWA safe-area 계산 오류 (비-standalone 불가시)',
    width: 390,
    base: '[data-gate-root]{padding-bottom:env(safe-area-inset-bottom,0px)}',
    mut: '[data-gate-root]{padding-bottom:0px!important}',
    expect: 'blind-env',
  },
];

async function capture(browser, { width, css, toast }) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, colorScheme: 'light', deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-gate-root]', { timeout: 5000 }).catch(() => {});
  await page.addStyleTag({ content: KILL });
  if (css) await page.addStyleTag({ content: css });
  if (toast != null) {
    await page.evaluate((bottom) => {
      const d = document.createElement('div');
      d.textContent = 'toast';
      Object.assign(d.style, { position: 'fixed', left: '16px', bottom: bottom + 'px', width: '120px', height: '36px', background: '#333', color: '#fff' });
      (document.querySelector('[data-gate-root]') || document.body).appendChild(d);
    }, toast);
  }
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const res = await page.evaluate(inPage, false);
  await ctx.close();
  return res;
}

const browser = await chromium.launch();
const rows = [];
let inScope = 0;
let caught = 0;
for (const c of CASES) {
  const before = await capture(browser, { width: c.width, css: c.base, toast: c.toastBefore });
  const after = await capture(browser, { width: c.width, css: c.base + c.mut, toast: c.toastAfter });
  const aLayer = after.violations.map((v) => v.rule);
  const r = matchTrees(hashTree(before.tree), hashTree(after.tree));
  const bSignals = r.changed.length + r.added.length + r.removed.length + r.moved.length + r.ambiguous.length;
  const detected = aLayer.length > 0 || bSignals > 0;

  let verdict;
  if (c.expect === 'catch') {
    inScope++;
    if (detected) { caught++; verdict = 'CAUGHT'; } else verdict = 'MISSED (regression!)';
  } else {
    verdict = detected ? 'caught (unexpected)' : 'blind off-device (expected)';
  }
  const how = [aLayer.length ? `A:${aLayer.join(',')}` : '', bSignals ? `B:${r.changed[0]?.deltas?.join(',') || `${bSignals} signals`}` : '']
    .filter(Boolean)
    .join(' | ');
  rows.push(`  ${detected ? '●' : '○'} ${c.id}  ${c.name.padEnd(34)} ${verdict}${how ? `  [${how}]` : ''}`);
}
await browser.close();

console.log('\n=== bug-corpus test (in-scope visual bugs from real commits) ===');
for (const row of rows) console.log(row);
console.log(`\nin-scope catch rate: ${caught}/${inScope}  (safe-area shown as off-device blind spot, not counted)`);
