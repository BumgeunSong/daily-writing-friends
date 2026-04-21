# Image Performance Measurement Script — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Playwright-based image performance measurement script that authenticates against local Supabase, navigates to the board feed page, and outputs a structured JSON report with per-image metrics + page-level web vitals.

**Architecture:** A single Playwright spec file (`tests/image-perf.spec.ts`) that reuses the existing auth setup (`storageState.auth.json`), navigates to a board page, injects PerformanceObserver callbacks that store LCP/CLS entries on `window` globals, then collects metrics inline via `page.evaluate()` and writes results to `test-results/image-perf-report.json`.

**Tech Stack:** Playwright (existing), Resource Timing API, PerformanceObserver API, browser DOM inspection.

**Prerequisites:**
- Local Supabase running (`supabase start`)
- E2E users seeded (`npx tsx scripts/seed-e2e-users.ts`)
- Auth setup run (`storageState.auth.json` exists)
- **Board with posts containing images must exist in local DB.** If local Supabase is empty, run the spec against production instead: set `E2E_ENV=production` and provide `E2E_REGULAR_EMAIL`/`E2E_REGULAR_PASSWORD` env vars, and update `baseURL` in the test to `https://www.dailywritingfriends.com`.

---

### Task 1: Create the Playwright spec with inline metrics collection

**Files:**
- Create: `tests/image-perf.spec.ts`

**Why inline instead of a separate module:** Playwright's `page.evaluate()` serializes functions via `.toString()`. Imported TypeScript functions may reference module-scope identifiers after compilation, causing runtime errors in the browser context. Keeping the collector inline avoids this entirely.

**Step 1: Write the spec**

```typescript
// tests/image-perf.spec.ts
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Image performance measurement script.
 *
 * Navigates to a board feed page (authenticated), waits for images to load,
 * then collects performance metrics and writes a JSON report.
 *
 * Run: npx playwright test tests/image-perf.spec.ts --project=chromium
 */
test('measure image loading performance on board feed', async ({ page }) => {
  // 1. Inject PerformanceObserver BEFORE navigation to capture LCP and CLS.
  //    Entries are stored on window globals because getEntriesByType()
  //    does not work for 'largest-contentful-paint' or 'layout-shift' —
  //    these are observer-only entry types per the spec.
  await page.addInitScript(() => {
    (window as any).__lcpEntries = [];
    (window as any).__clsEntries = [];

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as any).__lcpEntries.push(entry);
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as any).__clsEntries.push(entry);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  // 2. Navigate to the boards list to find the first available board
  await page.goto('/boards/list');

  // 3. Click the first board link to go to the feed page.
  //    Use content-based wait instead of networkidle (Supabase Realtime
  //    WebSocket keeps connections open, making networkidle unreliable).
  const boardLink = page.locator('a[href*="/board/"]').first();
  await boardLink.waitFor({ state: 'visible', timeout: 15_000 });
  await boardLink.click();

  // 4. Wait for post cards to appear (content-based, not networkidle)
  await page.waitForSelector('img', { timeout: 15_000 });

  // 5. Scroll down to trigger lazy-loaded images (if any)
  await page.evaluate(async () => {
    const scrollStep = window.innerHeight;
    const maxScroll = document.body.scrollHeight;
    for (let y = 0; y < maxScroll; y += scrollStep) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 500));
    }
    // Scroll back to top
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 1000));
  });

  // 6. Wait for ALL images to finish loading
  await page.waitForFunction(
    () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.length > 0 && imgs.every((img) => img.complete);
    },
    { timeout: 15_000 },
  );

  // 7. Collect metrics (inline function — no imports, fully serializable)
  const report = await page.evaluate(() => {
    const url = window.location.href;
    const timestamp = new Date().toISOString();
    const dpr = window.devicePixelRatio || 2;

    // --- Resource Timing (per-image network metrics) ---
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const imageResources = resourceEntries.filter(
      (e) =>
        e.initiatorType === 'img' ||
        /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(e.name),
    );

    // --- DOM inspection ---
    const imgElements = Array.from(document.querySelectorAll('img'));

    const images = imgElements.map((img) => {
      const resource = imageResources.find(
        (r) => r.name === img.currentSrc || r.name === img.src,
      );

      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Oversized = natural dimensions > display * devicePixelRatio
      const oversized =
        displayWidth > 0 &&
        displayHeight > 0 &&
        (naturalWidth > displayWidth * dpr || naturalHeight > displayHeight * dpr);

      // Cross-origin images return 0 for transferSize/decodedBodySize
      // (Firebase Storage lacks Timing-Allow-Origin header)
      const transferSize = resource?.transferSize ?? 0;
      const decodedBodySize = resource?.decodedBodySize ?? 0;
      const isCrossOriginRestricted = resource != null && transferSize === 0 && decodedBodySize === 0;

      // Component context: find closest data-testid or meaningful parent class
      let context = '';
      let el: Element | null = img;
      while (el && !context) {
        if (el.getAttribute('data-testid')) {
          context = `[data-testid="${el.getAttribute('data-testid')}"]`;
        } else if (el.classList.length > 0 && el !== img) {
          const meaningful = Array.from(el.classList).find(
            (c) => c.startsWith('post') || c.startsWith('avatar') || c.startsWith('board'),
          );
          if (meaningful) context = `.${meaningful}`;
        }
        el = el.parentElement;
      }
      if (!context && img.alt) context = `alt="${img.alt}"`;

      return {
        src: img.src,
        transferKB: Math.round(transferSize / 1024),
        decodedKB: Math.round(decodedBodySize / 1024),
        durationMs: resource ? Math.round(resource.duration) : -1,
        isCrossOriginRestricted,
        displayWidth,
        displayHeight,
        naturalWidth,
        naturalHeight,
        oversized,
        hasLazy: img.loading === 'lazy',
        hasDimensions: img.hasAttribute('width') && img.hasAttribute('height'),
        context,
      };
    });

    // --- LCP (from window globals populated by addInitScript) ---
    let lcpElement: string | null = null;
    let lcpTimeMs: number | null = null;
    const lcpEntries = (window as any).__lcpEntries as PerformanceEntry[];
    if (lcpEntries && lcpEntries.length > 0) {
      const lastLcp = lcpEntries[lcpEntries.length - 1] as PerformanceEntry & {
        element?: Element;
        startTime: number;
      };
      lcpTimeMs = Math.round(lastLcp.startTime);
      if (lastLcp.element) {
        const tag = lastLcp.element.tagName;
        const cls = lastLcp.element.className
          ? `.${String(lastLcp.element.className).split(' ').slice(0, 2).join('.')}`
          : '';
        lcpElement = `${tag}${cls}`;
      }
    }

    // --- CLS (from window globals populated by addInitScript) ---
    let clsScore = 0;
    const clsEntries = (window as any).__clsEntries as (PerformanceEntry & {
      hadRecentInput: boolean;
      value: number;
    })[];
    if (clsEntries) {
      for (const entry of clsEntries) {
        if (!entry.hadRecentInput) {
          clsScore += entry.value;
        }
      }
    }
    clsScore = Math.round(clsScore * 1000) / 1000;

    // --- TTFB ---
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const ttfbMs = navEntries.length > 0 ? Math.round(navEntries[0].responseStart) : null;

    // --- Generate issues ---
    const issues: string[] = [];
    const realImages = images.filter((img) => img.src && !img.src.startsWith('data:'));

    const missingLazy = realImages.filter((img) => !img.hasLazy);
    if (missingLazy.length > 0) {
      issues.push(`${missingLazy.length} image(s) missing loading="lazy"`);
    }

    const missingDimensions = realImages.filter((img) => !img.hasDimensions);
    if (missingDimensions.length > 0) {
      issues.push(
        `${missingDimensions.length} image(s) missing width/height attributes (causes layout shift)`,
      );
    }

    const oversizedImages = realImages.filter((img) => img.oversized);
    if (oversizedImages.length > 0) {
      issues.push(
        `${oversizedImages.length} image(s) oversized (natural > ${dpr}x display size)`,
      );
    }

    const crossOriginRestricted = realImages.filter((img) => img.isCrossOriginRestricted);
    if (crossOriginRestricted.length > 0) {
      issues.push(
        `${crossOriginRestricted.length} image(s) have cross-origin timing restriction (transferSize=0, likely Firebase Storage missing Timing-Allow-Origin)`,
      );
    }

    const totalTransferKB = images.reduce(
      (sum, img) => sum + (img.transferKB > 0 ? img.transferKB : 0),
      0,
    );

    if (clsScore > 0.1) {
      issues.push(`CLS score ${clsScore} exceeds 0.1 threshold`);
    }
    if (lcpTimeMs && lcpTimeMs > 2500) {
      issues.push(`LCP ${lcpTimeMs}ms exceeds 2500ms threshold`);
    }

    return {
      timestamp,
      url,
      summary: {
        totalImages: images.length,
        totalTransferKB,
        lcpElement,
        lcpTimeMs,
        clsScore,
        ttfbMs,
        issueCount: issues.length,
      },
      images,
      issues,
    };
  });

  // 8. Sanity check — fail loudly if no images found (likely a data/navigation issue)
  expect(report.summary.totalImages, 'No images found — page may not have loaded or has no image data').toBeGreaterThan(0);

  // 9. Warn if LCP could not be captured
  if (report.summary.lcpTimeMs === null) {
    console.warn('⚠ LCP could not be captured — observer may not have fired before user interaction');
  }

  // 10. Write report to file
  const outputDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'image-perf-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  // 11. Print summary to console
  console.log('\n=== Image Performance Report ===');
  console.log(`URL: ${report.url}`);
  console.log(`Total images: ${report.summary.totalImages}`);
  console.log(`Total transfer: ${report.summary.totalTransferKB} KB`);
  console.log(`TTFB: ${report.summary.ttfbMs ?? 'N/A'}ms`);
  console.log(
    `LCP: ${report.summary.lcpTimeMs ?? 'N/A'}ms (${report.summary.lcpElement ?? 'unknown'})`,
  );
  console.log(`CLS: ${report.summary.clsScore}`);
  console.log(`Issues: ${report.summary.issueCount}`);
  if (report.issues.length > 0) {
    console.log('\nIssues found:');
    report.issues.forEach((issue) => console.log(`  - ${issue}`));
  }
  console.log('\nPer-image details:');
  report.images.forEach((img) => {
    const flags = [
      !img.hasLazy && 'no-lazy',
      !img.hasDimensions && 'no-dimensions',
      img.oversized && 'oversized',
      img.isCrossOriginRestricted && 'cross-origin-restricted',
    ].filter(Boolean);
    const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
    const src = img.src.length > 80 ? `${img.src.slice(0, 80)}...` : img.src;
    console.log(`  ${src}`);
    console.log(
      `    transfer=${img.transferKB}KB decoded=${img.decodedKB}KB duration=${img.durationMs}ms display=${img.displayWidth}x${img.displayHeight} natural=${img.naturalWidth}x${img.naturalHeight} context=${img.context}${flagStr}`,
    );
  });
  console.log(`\nFull report: ${outputPath}`);
});
```

**Step 2: Run the measurement**

Run: `npx playwright test tests/image-perf.spec.ts --project=chromium --reporter=list`

Expected: Test passes, console shows image metrics summary, `test-results/image-perf-report.json` is created with `totalImages > 0`.

**Step 3: Commit**

```bash
git add tests/image-perf.spec.ts
git commit -m "feat: add Playwright image performance measurement spec"
```

---

### Task 2: Add the report file to .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add the report path to .gitignore**

Append to `.gitignore`:
```
# Image performance reports (generated)
test-results/image-perf-report.json
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore image perf report"
```

---

### Task 3: Verify end-to-end

**Step 1: Run the full measurement from scratch**

Run:
```bash
npx playwright test tests/image-perf.spec.ts --project=chromium --reporter=list
```

**Step 2: Read and verify the report**

Run: `cat test-results/image-perf-report.json | head -60`

Expected: Valid JSON with:
- `totalImages > 0`
- `images` array with `context` fields populated
- `lcpTimeMs` non-null (or a logged warning explaining why)
- `issues` array with actionable findings
- Cross-origin images flagged with `isCrossOriginRestricted: true`

**Step 3: Verify the report is agent-parseable**

The JSON should be readable by Claude in a follow-up conversation:
```
Read test-results/image-perf-report.json → identify top issues → propose fixes
```

---

## Review Findings Addressed

| # | Issue | Resolution |
|---|-------|------------|
| 1 | LCP/CLS `getEntriesByType` returns empty | Store via observer callbacks on `window.__lcpEntries`/`window.__clsEntries` |
| 2 | `page.evaluate(importedFn)` serialization risk | Inline the entire collector in the spec file |
| 3 | No test data in local Supabase | Added prerequisites section with production fallback instructions |
| 4 | `networkidle` unreliable with Supabase Realtime | Replaced with `waitForSelector('img')` content-based wait |
| 5 | `waitForTimeout(3000)` fragile | Removed; rely on `waitForSelector` + `waitForFunction(img.complete)` |
| 6 | Firebase Storage cross-origin timing restriction | Detect and flag `isCrossOriginRestricted` per image |
| 7 | Missing component-level mapping | Added `context` field (closest `data-testid` or meaningful parent class) |
| 8 | Hardcoded 2x DPR | Use `window.devicePixelRatio` |
| 9 | Missing TTFB | Added `ttfbMs` from navigation timing |
| 10 | Silent failure if no images | Added `expect(totalImages).toBeGreaterThan(0)` assertion |
| 11 | LCP null without warning | Added console.warn when LCP is null |

## Not addressed (acknowledged limitations)

- **Flicker from React re-renders:** This script measures structural image issues (missing lazy, dimensions, oversized) and web vitals, but cannot detect re-render-driven flicker from React Query refetches. That requires a separate React DevTools profiling approach.
