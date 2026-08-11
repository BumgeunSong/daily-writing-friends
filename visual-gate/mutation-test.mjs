// Mutation test: inject subtle UI bugs into the harness and measure what the
// B-layer catches. Includes deliberate blind spots (horizontal-only shift,
// opacity) and an epsilon-boundary case, so the profile is honest, not flattering.
// Run: node visual-gate/mutation-test.mjs [url]
import { chromium } from '@playwright/test';
import { inPage } from './gate.mjs';
import { hashTree, matchTrees } from './matcher.mjs';

const URL = process.argv[2] || 'http://localhost:5200/visual-gate/index.html?component=mentionable';
const KILL = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

const MUTATIONS = [
  { name: 'font-size 16->15 (button)', css: '[data-gate-root] button{font-size:15px!important}', expect: 'catch' },
  { name: 'font-weight 400->700 (button)', css: '[data-gate-root] button{font-weight:700!important}', expect: 'catch' },
  { name: 'text color darken', css: '[data-gate-root]{color:rgb(60,60,60)!important}', expect: 'catch' },
  { name: 'button background tint', css: '[data-gate-root] button{background-color:rgb(220,40,40)!important}', expect: 'catch' },
  { name: 'vertical shift +2px (above eps)', css: '[data-gate-root] button{margin-top:2px!important}', expect: 'catch' },
  { name: 'vertical shift +1px (below eps, ignore)', css: '[data-gate-root] button{margin-top:1px!important}', expect: 'control' },
  { name: 'width shrink (button 44px)', css: '[data-gate-root] button{width:44px!important;min-width:44px!important}', expect: 'catch' },
  { name: 'horizontal shift translateX 8px', css: '[data-gate-root] button{transform:translateX(8px)!important}', expect: 'miss' },
  { name: 'opacity 1->0.5 (button)', css: '[data-gate-root] button{opacity:0.5!important}', expect: 'miss' },
  { name: 'control: no-op', css: '', expect: 'control' },
];

async function capture(browser, mutationCss) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-gate-root]', { timeout: 5000 }).catch(() => {});
  await page.addStyleTag({ content: KILL });
  if (mutationCss) await page.addStyleTag({ content: mutationCss });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const res = await page.evaluate(inPage, false);
  await ctx.close();
  return res.tree;
}

const browser = await chromium.launch();
const before = hashTree(await capture(browser, ''));

let realBugs = 0;
let realCaught = 0;
let falsePositives = 0;
const rows = [];
for (const mut of MUTATIONS) {
  const after = hashTree(await capture(browser, mut.css));
  const r = matchTrees(before, after);
  const signals = r.changed.length + r.added.length + r.removed.length + r.moved.length + r.ambiguous.length;
  const detected = signals > 0;
  let verdict;
  if (mut.expect === 'catch') {
    realBugs++;
    if (detected) { realCaught++; verdict = 'CAUGHT'; } else verdict = 'MISSED (regression!)';
  } else if (mut.expect === 'control') {
    if (detected) { falsePositives++; verdict = 'FALSE POSITIVE'; } else verdict = 'clean (correct)';
  } else {
    verdict = detected ? 'caught (bonus)' : 'blind spot (expected)';
  }
  const detail = r.changed.length ? ` [${r.changed[0].deltas.join(', ')}]` : '';
  rows.push(`  ${detected ? '●' : '○'} ${mut.name.padEnd(42)} ${verdict}${detail}`);
}
await browser.close();

console.log('\n=== mutation test (mentionable, E0 390 light) ===');
for (const row of rows) console.log(row);
console.log(`\ncatch rate (metric-mapped bugs): ${realCaught}/${realBugs}`);
console.log(`false positives (controls): ${falsePositives}`);
