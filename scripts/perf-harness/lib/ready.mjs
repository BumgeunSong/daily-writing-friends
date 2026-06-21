// Per-route readiness + functional gate (reward-hack guardrail #2).
// A route is "ready" when its meaningful content has actually rendered — not
// merely when the network went quiet. Under CPU throttling the auth-triggered
// queries fire late, so we wait on real DOM signals before reading vitals.
// If readiness never arrives, the page is broken and the measurement is void.

const POST_CARD = '[role="button"][aria-label="게시글 상세로 이동"]';

/**
 * Wait until the route has rendered its expected content.
 * Throws on timeout — a broken/empty page must void the score, never pass.
 */
export async function waitForRouteReady(page, routeKey, timeout = 30000) {
  switch (routeKey) {
    case 'root':
      // RootRedirect sends an active member to /boards.
      await page.waitForURL(/\/boards/, { timeout });
      await page.waitForSelector('a, [role="button"]', { timeout });
      return;
    case 'boardFeed':
      await page.waitForSelector(POST_CARD, { timeout });
      return;
    case 'boardsList':
      // At least one board card link must render (not the empty-state copy).
      await page.waitForFunction(
        () => document.querySelectorAll('main a[href^="/board/"]').length > 0,
        undefined,
        { timeout },
      );
      return;
    case 'postDetail':
      // Post title heading proves the post body resolved.
      await page.waitForSelector('h1', { timeout });
      return;
    case 'notifications':
      // Skeletons must clear (list resolved or empty-state shown).
      await page.waitForFunction(
        () => document.querySelectorAll('[data-testid*="skeleton"]').length === 0,
        undefined,
        { timeout },
      );
      // And the inbox must actually have items (the fixture seeds 35).
      await page.waitForFunction(
        () => (document.body.innerText || '').replace(/\s+/g, '').length > 50,
        undefined,
        { timeout },
      );
      return;
    default:
      throw new Error(`Unknown route key for readiness: ${routeKey}`);
  }
}
