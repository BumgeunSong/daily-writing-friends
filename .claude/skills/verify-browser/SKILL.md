---
name: verify-browser
description: Use after UI/frontend changes — layout, responsive behavior, navigation/routing, or any user-facing flow — to prove it actually works by driving a real headless browser (Playwright) against the running dev server. Asserts behavior (clicks, URL changes, visible text), measures layout (alignment via bounding boxes, overflow via scrollWidth minus clientWidth), captures console/page errors, and saves screenshots. Reach for this whenever "it type-checks and the unit tests pass" does not prove the feature renders and behaves correctly in a browser. Complements verify-runtime (which checks data-flow via dev logs).
---

# Verify in a Real Browser

UI correctness is not provable by type-check or unit tests alone. A component can compile, pass jsdom tests, and still be misaligned, overflow, throw at runtime, or navigate to the wrong place. This pillar drives a **real Chromium** against the running app and asserts what the user would see.

The four verification pillars: **type-check** → **unit/integration tests** → **[verify-runtime](../verify-runtime/SKILL.md)** (data-flow via dev logs) → **verify-browser** (this one, UI/behavior).

## When to Use

- Changed a component's layout, spacing, alignment, or responsive (`md:`/`lg:`) behavior.
- Touched navigation/routing, redirects, or click handlers.
- Built a user-facing flow where the golden path + edge cases must be exercised in a browser.
- Any claim of "done" that rests on rendering or interaction, not just data.

## Procedure

1. **Start the dev server** (background) — see [run-web](../run-web/SKILL.md) for the recipe; `.mise.toml` pins node, so no PATH prefix is needed:
   ```bash
   nohup pnpm --filter web dev > /tmp/dev.log 2>&1 &
   # confirm: grep "Local:" /tmp/dev.log  -> http://localhost:5173/
   ```
2. **Write a throwaway harness** at `apps/web/scripts/verify-*.mjs` (skeleton below). Assert behavior + layout + console errors; screenshot to `/tmp`.
3. **Run it** and read the PASS/FAIL tally; open the screenshots to confirm visually:
   ```bash
   node apps/web/scripts/verify-foo.mjs
   ```
4. **Clean up**: delete the throwaway script and stop the server:
   ```bash
   rm -f apps/web/scripts/verify-foo.mjs
   lsof -ti:5173 | xargs kill 2>/dev/null
   ```

The harness is intentionally throwaway — it encodes *this change's* assertions, not a permanent test. Promote a check to a real Playwright `e2e` test only if it guards an ongoing contract.

## Harness Skeleton

```js
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:5173';
const out = [];
const errs = [];
const log = (n, ok, d = '') => { out.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  -- ' + d : ''}`); };

// wait for server
for (let i = 0; i < 30; i++) { try { if ((await fetch(`${BASE}/`)).ok) break; } catch {} await new Promise(r => setTimeout(r, 500)); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));

try {
  await page.goto(`${BASE}/your-route`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  // --- behavior ---
  const body = await page.locator('body').textContent();
  log('heading renders', (await page.getByRole('heading', { name: '제목' }).count()) > 0);
  await page.getByRole('button', { name: '버튼' }).first().click();
  await page.waitForURL('**/expected', { timeout: 5000 }).catch(() => {});
  log('click routes correctly', new URL(page.url()).pathname === '/expected', page.url());

  // --- layout: no horizontal overflow ---
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log('no horizontal overflow', overflow <= 1, `overflowX=${overflow}`);

  await page.screenshot({ path: '/tmp/verify.png', fullPage: true });
  log('no console/page errors', errs.length === 0, errs.slice(0, 5).join(' | '));
} finally {
  await browser.close();
}
const failed = out.filter(x => !x).length;
console.log(`\n=== ${out.length - failed}/${out.length} passed ===`);
if (failed) process.exit(1);
```

## Assertion Recipes

- **Click then navigation**: `await locator.click()` then `await page.waitForURL('**/x')`; assert `new URL(page.url()).pathname`.
- **Visible text / heading**: `getByRole('heading', { name })`, or `(await body).includes(text)` for loose checks.
- **Edge-to-edge alignment** (two elements line up): compare `boundingBox()` — `Math.abs(a.x - b.x) <= 1 && Math.abs((a.x+a.width) - (b.x+b.width)) <= 1`.
- **Sticky/fixed position**: in `page.evaluate`, walk ancestors for `getComputedStyle(n).position === 'fixed'` and check distance to the viewport edge.
- **Navigation isolation** (no escape links): iterate `a[href]` via locators, assert each href is in the allowed set.
- **Console/runtime errors**: subscribe to `console` (type `error`) and `pageerror` before navigating.

## Gotchas (learned the hard way)

- **Avoid the `$$eval` / `$eval` locator methods** — a security hook blocks any literal `eval` token immediately followed by an open-paren. Use plain locators, or `page.evaluate(() => ...)` for in-page measurement (the `evaluate` method name is not flagged).
- **Hidden duplicate layouts**: responsive code renders both a mobile and desktop tree (`block lg:hidden` / `hidden lg:block`), so `getByText('X').first()` may grab the *hidden* copy and the click times out. Pick a viewport where only one layout renders (e.g. width `< lg` for the mobile tree), or scope the locator to the visible container.
- **Node toolchain**: `.mise.toml` pins node 22.14.0 (see [run-web](../run-web/SKILL.md)). If a shell lacks mise it falls to the broken Homebrew node (`Abort trap: 6`) — run `mise install`, or prefix with `mise exec -- ...`.
- **vitest exit 1 is not always failure**: a known Firebase-analytics async rejection fires after env teardown and flips the exit code to 1 even when every test passes. Read the `Tests N passed` line, not just the exit code.
- **cwd drift**: a prior `cd` persists between Bash calls. Use absolute or repo-root-relative paths when running the harness.

## Red Flags

- "It type-checks, so the layout is fine." — Compilation says nothing about alignment, overflow, or what renders.
- "The unit test passes." — jsdom has no layout engine; it cannot catch overflow, sticky positioning, or visual regressions.
- "I'll just describe what it should look like." — Take the screenshot and read it. Claims about UI without a rendered artifact are unverified.
- "I can't run a browser." — Say so explicitly and note the verification gap rather than implying the UI was checked.
