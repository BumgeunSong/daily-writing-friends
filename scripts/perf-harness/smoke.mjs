// Ground-truth verification: build is served, auth is injected, and every route
// actually renders the frozen fixture. Run BEFORE trusting any measurement.
//
// Usage: node scripts/perf-harness/smoke.mjs   (expects local Supabase running + seeded)

import { chromium } from '@playwright/test';
import { startPreview } from './lib/server.mjs';
import { authenticate, sessionStorageEntry } from './lib/auth.mjs';
import { loadRoutes, storageKeyFor } from './lib/config.mjs';
import { waitForRouteReady } from './lib/ready.mjs';

const POST_CARD = '[role="button"][aria-label="게시글 상세로 이동"]';

async function main() {
  console.log('Authenticating frozen-fixture member...');
  const session = await authenticate();
  console.log(`  ok: user ${session.user?.email} (${session.user?.id})`);

  console.log('Starting preview server...');
  const { origin, stop } = await startPreview();
  console.log(`  serving at ${origin}`);

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
      isMobile: true,
    });
    const entry = sessionStorageEntry(session);
    await context.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      [storageKeyFor(), entry.value],
    );

    for (const route of loadRoutes()) {
      const page = await context.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(origin + route.path, { waitUntil: 'networkidle', timeout: 60000 });
      let ready = true;
      try {
        await waitForRouteReady(page, route.key);
      } catch (e) {
        ready = false;
        errors.push(`NOT READY: ${e.message.split('\n')[0]}`);
      }
      await page.waitForTimeout(500);

      const info = await page.evaluate((cardSel) => {
        const text = document.body.innerText || '';
        return {
          url: location.pathname,
          textLen: text.length,
          textHead: text.replace(/\s+/g, ' ').slice(0, 120),
          postCards: document.querySelectorAll(cardSel).length,
          headings: document.querySelectorAll('h1,h2,[role="heading"]').length,
          images: document.querySelectorAll('img').length,
          skeletons: document.querySelectorAll('[data-testid*="skeleton"]').length,
        };
      }, POST_CARD);

      console.log(`\n[${route.key}] ${route.path}  ${ready ? 'READY' : 'NOT-READY'}`);
      console.log(`  -> landed: ${info.url}`);
      console.log(`  text=${info.textLen} cards=${info.postCards} headings=${info.headings} imgs=${info.images} skeletons=${info.skeletons}`);
      console.log(`  head: ${info.textHead}`);
      if (errors.length) console.log(`  console errors: ${errors.slice(0, 3).join(' | ')}`);
      await page.close();
    }
  } finally {
    await browser.close();
    await stop();
  }
}

main().catch((e) => {
  console.error('SMOKE FAILED:', e);
  process.exit(1);
});
