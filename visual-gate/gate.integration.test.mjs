import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { inPage } from './gate.mjs';

const VIEWPORT = { width: 320, height: 640 };

const page = (bodyMarkup) => `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">${bodyMarkup}</body></html>`;

// A child wider than the 320px viewport forces document overflow — the exact
// mobile regression the A-layer exists to catch.
const OVERFLOWING = page('<div data-gate-root><div style="width:2000px;height:40px">wide</div></div>');
const CLEAN = page('<div data-gate-root style="max-width:288px"><p style="margin:0">hello</p><button style="width:100%">보내기</button></div>');

let browser;
before(async () => {
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
});

async function violationsFor(html) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const tab = await context.newPage();
  await tab.setContent(html, { waitUntil: 'load' });
  const result = await tab.evaluate(inPage, { dark: false, eps: 1 });
  await context.close();
  return result.violations.map((violation) => violation.rule);
}

test('A-layer flags horizontal overflow on a planted regression', async () => {
  const rules = await violationsFor(OVERFLOWING);
  assert.ok(rules.includes('horizontal-overflow'), `expected horizontal-overflow, got ${JSON.stringify(rules)}`);
});

test('A-layer reports zero violations on a clean tree that fits the viewport', async () => {
  const rules = await violationsFor(CLEAN);
  assert.deepEqual(rules, []);
});
