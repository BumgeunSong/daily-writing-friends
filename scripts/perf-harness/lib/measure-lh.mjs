// Outer reward engine: Lighthouse (mobile + simulated/Lantern throttling).
// Playwright owns the Chrome process via a persistent context exposing a fixed
// remote-debugging port; we seed the supabase session into that profile's
// localStorage, then Lighthouse attaches to the SAME port (disableStorageReset
// keeps the session) and measures the authenticated app.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { sessionStorageEntry } from './auth.mjs';
import { storageKeyFor } from './config.mjs';

const DEBUG_PORT = Number(process.env.PERF_LH_DEBUG_PORT || 9333);

const LH_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',
    throttlingMethod: 'simulate',
    onlyCategories: ['performance'],
    disableStorageReset: true,
    screenEmulation: {
      mobile: true,
      width: 360,
      height: 640,
      deviceScaleFactor: 2,
      disabled: false,
    },
  },
};

/** Single authenticated Lighthouse measurement of one route. */
export async function measureLighthouse(origin, routePath, session) {
  const userDataDir = mkdtempSync(join(tmpdir(), 'lh-profile-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: [
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--no-sandbox',
      '--disable-gpu',
    ],
  });
  try {
    // Seed localStorage for the origin, then park so the tab is inert.
    const page = await context.newPage();
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    const entry = sessionStorageEntry(session);
    await page.evaluate(
      ([key, value]) => window.localStorage.setItem(key, value),
      [storageKeyFor(), entry.value],
    );
    await page.goto('about:blank');

    const result = await lighthouse(
      origin + routePath,
      { port: DEBUG_PORT, output: 'json', logLevel: 'error' },
      LH_CONFIG,
    );
    const lhr = result.lhr;
    if (lhr.runtimeError) {
      throw new Error(`Lighthouse runtimeError: ${lhr.runtimeError.message}`);
    }
    const a = lhr.audits;
    return {
      score: Math.round(lhr.categories.performance.score * 100),
      lcp: round(a['largest-contentful-paint'].numericValue),
      fcp: round(a['first-contentful-paint'].numericValue),
      cls: round(a['cumulative-layout-shift'].numericValue, 4),
      tbt: round(a['total-blocking-time'].numericValue),
      si: round(a['speed-index'].numericValue),
    };
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

function round(x, dp = 0) {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}
