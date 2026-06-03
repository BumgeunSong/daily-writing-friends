// Single-shot reproduction of TC-07's failing path so we can see what's on screen.
import { chromium } from '@playwright/test';
import { authenticate, sessionStorageEntry } from '../../scripts/perf-harness/lib/auth.mjs';
import { storageKeyFor, loadManifest } from '../../scripts/perf-harness/lib/config.mjs';

const ORIGIN = process.env.QA_ORIGIN || 'http://localhost:5174';
const M = loadManifest();

const session = await authenticate();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(
  ([k, v]) => window.localStorage.setItem(k, v),
  [storageKeyFor(), sessionStorageEntry(session).value],
);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

// Visit /notifications first (mimics post-TC-06 state)
await page.goto(ORIGIN + M.routes.notifications, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
console.log('After /notifications, url=', page.url());

// Now navigate to boardFeed and dump
await page.goto(ORIGIN + M.routes.boardFeed, { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('After /board/:id goto, url=', page.url());

// Sample after 5s
await page.waitForTimeout(5000);
console.log('@5s url=', page.url());
console.log('@5s body.innerText[0..400]=', (await page.evaluate(() => document.body.innerText)).slice(0, 400));
console.log('@5s card count=', await page.locator('[aria-label="게시글 상세로 이동"]').count());

// Sample after another 5s
await page.waitForTimeout(5000);
console.log('@10s url=', page.url());
console.log('@10s card count=', await page.locator('[aria-label="게시글 상세로 이동"]').count());
console.log('@10s headers=', await page.locator('header').allTextContents());

// Network log (last few requests)
const reqLog = [];
page.on('request', (r) => reqLog.push(`REQ ${r.method()} ${r.url()}`));
page.on('response', (r) => reqLog.push(`RESP ${r.status()} ${r.url()}`));
await page.waitForTimeout(2000);
console.log('--- recent net ---');
for (const l of reqLog.slice(-15)) console.log(l);

await browser.close();
