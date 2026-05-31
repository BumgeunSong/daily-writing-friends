// Inner diagnostic + cross-check engine: Playwright + Google web-vitals library.
// Measures LCP/FCP/CLS independently of Lighthouse (the reward-hack tripwire) and
// surfaces LCP-element attribution so the loop can reason about real bottlenecks.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { sessionStorageEntry } from './auth.mjs';
import { storageKeyFor } from './config.mjs';
import { waitForRouteReady } from './ready.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_VITALS_IIFE = readFileSync(
  join(__dirname, '..', '..', '..', 'node_modules', 'web-vitals', 'dist', 'web-vitals.attribution.iife.js'),
  'utf8',
);

// Lighthouse "mobile" real-throttling equivalents, applied via CDP so the
// web-vitals numbers land in the same regime as the simulated Lighthouse run.
const CPU_THROTTLE = 4;
const NETWORK = {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps
  uploadThroughput: (750 * 1024) / 8, // 750 Kbps
  latency: 150, // ms RTT
};
const MOBILE_VIEWPORT = { width: 360, height: 640 };

/** Single authenticated web-vitals measurement of one route. */
export async function measureWebVitals(origin, routePath, session, routeKey) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({
      viewport: MOBILE_VIEWPORT,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    });

    // Inject the session into localStorage before any app script runs.
    const entry = sessionStorageEntry(session);
    await context.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, value);
      },
      [storageKeyFor(), entry.value],
    );

    // Register web-vitals collectors before navigation. Playwright wraps init
    // scripts in a function, so the IIFE's top-level `var webVitals` stays
    // function-scoped — pin it onto window explicitly so the next script sees it.
    await context.addInitScript(WEB_VITALS_IIFE + '\n;window.webVitals = webVitals;');
    await context.addInitScript(() => {
      window.__perfVitals = {};
      const save = (m) => {
        window.__perfVitals[m.name] = {
          value: m.value,
          attribution: m.attribution
            ? {
                element: m.attribution.element ?? m.attribution.largestShiftTarget ?? null,
                url: m.attribution.url ?? null,
              }
            : null,
        };
      };
      const wv = window.webVitals;
      wv.onLCP(save, { reportAllChanges: true });
      wv.onFCP(save, { reportAllChanges: true });
      wv.onCLS(save, { reportAllChanges: true });
      wv.onTTFB(save, { reportAllChanges: true });
      wv.onINP(save, { reportAllChanges: true });
    });

    const page = await context.newPage();

    // Real CPU + network throttling via CDP.
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', NETWORK);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });

    await page.goto(origin + routePath, {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Functional gate: wait until the route's real content rendered.
    await waitForRouteReady(page, routeKey);

    // Let layout settle so CLS/LCP reportAllChanges converge.
    await page.waitForTimeout(2500);

    const vitals = await page.evaluate(() => window.__perfVitals || {});
    await context.close();

    return {
      lcp: num(vitals.LCP?.value),
      fcp: num(vitals.FCP?.value),
      cls: num(vitals.CLS?.value) ?? 0,
      inp: num(vitals.INP?.value),
      ttfb: num(vitals.TTFB?.value),
      lcpElement: vitals.LCP?.attribution?.element ?? null,
    };
  } finally {
    await browser.close();
  }
}

function num(x) {
  return typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 1000) / 1000 : null;
}
