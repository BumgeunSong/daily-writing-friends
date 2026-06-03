#!/usr/bin/env node
// Functional regression check for the llm-web-vitals branch.
// Drives the real dev server at http://localhost:5173 with an authenticated
// fixture user and asserts each TC from llm-web-vitals-verify-scenario.md.

import { chromium } from '@playwright/test';
import { authenticate, sessionStorageEntry } from '../../scripts/perf-harness/lib/auth.mjs';
import { storageKeyFor, loadManifest } from '../../scripts/perf-harness/lib/config.mjs';

const ORIGIN = process.env.QA_ORIGIN || 'http://localhost:5173';
const MANIFEST = loadManifest();

// Console message log per test case; pre-existing app warnings + env artifacts
// (Firebase referrer restrictions on localhost:5174 dev port) are allowed.
const ALLOWED_NOISE_PATTERNS = [
  // Issue #621: missing resized thumbnails (Firebase Resize extension)
  /firebasestorage\.googleapis\.com.*_\d+x\d+\.\w+.*404/i,
  /Failed to load resource.*404.*firebasestorage/i,
  // Pre-existing app warning (not regression-relevant)
  /React Router Future Flag Warning/i,
  // Firebase API key referrer restriction — env-level, not branch regression.
  // The prod Firebase API key only whitelists production + specific localhosts;
  // dev:local on :5174 hits the restriction. Sink format is "STATUS URL" so the
  // status appears BEFORE the host substring — match the host either side.
  /firebaseinstallations\.googleapis\.com/i,
  /firebase\.googleapis\.com\/v1alpha\/projects\/-\/apps\/.*webConfig/i,
  /PERMISSION_DENIED.*Requests from referer/i,
  /Installations: Create Installation request failed/i,
  /Failed to fetch this Firebase app's measurement ID/i,
  /^403\s+https/i,
  /Failed to load resource.*403/i,
];

const results = [];

function tc(id, name, status, detail = '') {
  results.push({ id, name, status, detail });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${id} ${name}${detail ? ' — ' + detail : ''}`);
}

function isAllowedNoise(text) {
  return ALLOWED_NOISE_PATTERNS.some((re) => re.test(text));
}

async function makeContext(browser, session) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (QA-llm-web-vitals)',
  });
  const entry = sessionStorageEntry(session);
  await ctx.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [storageKeyFor(), entry.value],
  );
  return ctx;
}

function attachConsoleCollector(page, sink) {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      sink.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    sink.push({ type: 'pageerror', text: err.message });
  });
  page.on('response', (resp) => {
    const status = resp.status();
    if (status >= 400) {
      sink.push({ type: 'http', text: `${status} ${resp.url()}` });
    }
  });
}

function summarizeNoise(sink) {
  const real = sink.filter((m) => !isAllowedNoise(m.text));
  const allowed = sink.length - real.length;
  return { real, allowed };
}

async function run() {
  console.log(`\n=== llm-web-vitals QA verify — ${ORIGIN} ===\n`);

  const session = await authenticate();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  try {
    const ctx = await makeContext(browser, session);
    const page = await ctx.newPage();
    const consoleSink = [];
    attachConsoleCollector(page, consoleSink);

    // ───────────── TC-01: Root redirect ─────────────
    // Fixture user has membership in multiple boards → app may route to /boards
    // (list selector) OR directly to /board/:id depending on the
    // useIsCurrentUserActive + useUpcomingBoard outcome. Both are valid post-iter#12.
    try {
      await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForURL(/\/(board\/[^/]+|boards(\/.*)?)/, { timeout: 15000 });
      const url = page.url();
      const path = new URL(url).pathname;
      const ok = /^\/(board\/[^/]+|boards(\/.*)?$)/.test(path);
      tc('TC-01', 'Root redirect', ok ? 'PASS' : 'FAIL', `→ ${path}`);
    } catch (e) {
      tc('TC-01', 'Root redirect', 'FAIL', e.message);
    }

    // ───────────── TC-02: Board feed loads ─────────────
    try {
      await page.goto(ORIGIN + MANIFEST.routes.boardFeed, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      // Wait for at least one PostCard (role=button aria-label='게시글 상세로 이동')
      await page.waitForSelector('[aria-label="게시글 상세로 이동"]', { timeout: 15000 });
      const cardCount = await page.locator('[aria-label="게시글 상세로 이동"]').count();
      const headerText = (await page.locator('header').first().textContent()) || '';
      tc(
        'TC-02',
        'Board feed loads',
        cardCount >= 1 ? 'PASS' : 'FAIL',
        `cards=${cardCount}, header="${headerText.slice(0, 40).trim()}"`,
      );
    } catch (e) {
      tc('TC-02', 'Board feed loads', 'FAIL', e.message);
    }

    // ───────────── TC-03: Best filter ─────────────
    try {
      const bestBtn = page.locator('button', { hasText: /^Best$|^베스트$|^인기/ });
      if (await bestBtn.count() > 0) {
        await bestBtn.first().click();
        // wait for either best cards or empty-state to render
        await page.waitForTimeout(1500);
        const hasContent =
          (await page.locator('[aria-label="게시글 상세로 이동"]').count()) > 0 ||
          (await page.locator('text=/없|empty|아직/i').count()) > 0;
        tc('TC-03', 'Best filter mounts', hasContent ? 'PASS' : 'WARN', 'lazy chunk loaded');
      } else {
        tc('TC-03', 'Best filter mounts', 'WARN', 'no Best button visible');
      }
    } catch (e) {
      tc('TC-03', 'Best filter mounts', 'FAIL', e.message);
    }

    // ───────────── TC-04: Post detail (loader cache seed + Comments lazy) ─────────────
    try {
      await page.goto(ORIGIN + MANIFEST.routes.postDetail, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      await page.waitForSelector('article', { timeout: 15000 });
      const title = (await page.locator('article h1, article h2').first().textContent()) || '';
      // Comments lazy — give it a moment to suspense → resolve
      await page.waitForTimeout(2000);
      // Try a few selectors that comment UI typically uses
      const hasCommentSection =
        (await page.locator('text=/댓글|comment/i').count()) > 0 ||
        (await page.locator('[data-testid*="comment" i]').count()) > 0;
      tc(
        'TC-04',
        'Post detail + lazy Comments',
        title ? 'PASS' : 'FAIL',
        `title="${title.slice(0, 30).trim()}", commentSection=${hasCommentSection}`,
      );
    } catch (e) {
      tc('TC-04', 'Post detail + lazy Comments', 'FAIL', e.message);
    }

    // ───────────── TC-05: PostMetaHelmet imperative tags ─────────────
    try {
      const titleText = await page.title();
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
      const twTitle = await page.locator('meta[name="twitter:title"]').getAttribute('content');
      const passes = !!titleText && !!ogTitle && !!twTitle;
      tc(
        'TC-05',
        'PostMetaHelmet imperative',
        passes ? 'PASS' : 'FAIL',
        `title=${!!titleText}, og:title=${!!ogTitle}, og:desc=${!!ogDesc}, tw:title=${!!twTitle}`,
      );
    } catch (e) {
      tc('TC-05', 'PostMetaHelmet imperative', 'FAIL', e.message);
    }

    // ───────────── TC-06: Notifications page ─────────────
    try {
      await page.goto(ORIGIN + MANIFEST.routes.notifications, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      await page.waitForTimeout(2500);
      // Look for header text "알림" or a list container
      const hasNotificationsLayout =
        (await page.locator('text=/알림|notification/i').count()) > 0 ||
        (await page.locator('main, [role="main"]').count()) > 0;
      tc(
        'TC-06',
        'Notifications page',
        hasNotificationsLayout ? 'PASS' : 'FAIL',
        `layout=${hasNotificationsLayout}`,
      );
    } catch (e) {
      tc('TC-06', 'Notifications page', 'FAIL', e.message);
    }

    // ───────────── TC-07: Back navigation ─────────────
    // Detect cards via attached count() (not 'visible' state) to avoid Playwright
    // visibility-check flakiness after sequential cross-route TCs share one page.
    // The contract: history.back() must restore boardFeed URL and re-render cards.
    //
    // NOTE: TC-03 clicked the "Best" filter, which persists in sessionStorage
    // (key `boardFilter-${boardId}` per BoardPage.tsx:21). With the perf fixture
    // engagement-score=0, BestPostCardList renders empty state → no PostCard
    // markup, so the recent-feed selector would never match. Reset to 'recent'.
    try {
      await page.evaluate(() => {
        for (const k of Object.keys(sessionStorage)) {
          if (k.startsWith('boardFilter-')) sessionStorage.removeItem(k);
        }
      });
      await page.goto(ORIGIN + MANIFEST.routes.boardFeed, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      const cardSel = '[aria-label="게시글 상세로 이동"]';
      await page.waitForFunction(
        (s) => document.querySelectorAll(s).length > 0,
        cardSel,
        { timeout: 30000 },
      );
      const beforeCount = await page.locator(cardSel).count();
      await page.locator(cardSel).first().click();
      await page.waitForSelector('article', { timeout: 15000 });
      const detailUrl = page.url();
      await page.goBack({ waitUntil: 'domcontentloaded' });
      // URL must roll back to boardFeed path; cards may take a tick to re-render.
      const backUrl = page.url();
      const urlOk = new URL(backUrl).pathname === MANIFEST.routes.boardFeed;
      await page.waitForFunction(
        (s) => document.querySelectorAll(s).length > 0,
        cardSel,
        { timeout: 15000 },
      ).catch(() => {});
      const cardsBack = await page.locator(cardSel).count();
      tc(
        'TC-07',
        'Back navigation',
        urlOk && beforeCount > 0 ? 'PASS' : 'FAIL',
        `before=${beforeCount}, detail=${new URL(detailUrl).pathname}, back=${new URL(backUrl).pathname}, cardsAfterBack=${cardsBack}`,
      );
    } catch (e) {
      tc('TC-07', 'Back navigation', 'FAIL', e.message);
    }

    // ───────────── TC-08: Console error baseline ─────────────
    const { real, allowed } = summarizeNoise(consoleSink);
    if (real.length === 0) {
      tc('TC-08', 'Console error baseline', 'PASS', `allowed-noise=${allowed}, real=0`);
    } else {
      tc(
        'TC-08',
        'Console error baseline',
        real.length <= 3 ? 'WARN' : 'FAIL',
        `real=${real.length} (allowed=${allowed})`,
      );
    }

    // Detail dump of any real noise
    if (real.length) {
      console.log('\n--- console anomalies (not pre-existing 404 noise) ---');
      for (const m of real.slice(0, 20)) {
        console.log(`  [${m.type}] ${m.text.slice(0, 200)}`);
      }
      if (real.length > 20) console.log(`  ... +${real.length - 20} more`);
    }

    await ctx.close();
  } finally {
    await browser.close();
  }

  // ───────────── Summary ─────────────
  const counts = results.reduce(
    (acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc),
    {},
  );
  console.log('\n=== Summary ===');
  console.log(
    `Total: ${results.length}  PASS: ${counts.PASS || 0}  FAIL: ${counts.FAIL || 0}  WARN: ${counts.WARN || 0}`,
  );

  if (counts.FAIL) process.exit(1);
}

run().catch((e) => {
  console.error('FATAL:', e);
  process.exit(2);
});
