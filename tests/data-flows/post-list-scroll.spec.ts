import { test, expect } from '@playwright/test';

const BOARD_ID = 'e2e-test-board';
const POST_CARD = '[role="button"][aria-label="게시글 상세로 이동"]';

test.describe('Post List Infinite Scroll', () => {
  test('initial page load shows posts', async ({ page }) => {
    await page.goto(`/board/${BOARD_ID}`);

    // Wait for post cards to render
    const postCards = page.locator(POST_CARD);
    await expect(postCards.first()).toBeVisible({ timeout: 15000 });

    const initialCount = await postCards.count();
    expect(initialCount).toBeGreaterThan(0);
  });

  test('scrolling loads additional posts', async ({ page }) => {
    await page.goto(`/board/${BOARD_ID}`);

    // Wait for initial posts to render
    const postCards = page.locator(POST_CARD);
    await expect(postCards.first()).toBeVisible({ timeout: 15000 });
    const initialCount = await postCards.count();

    // Scroll to the last visible post
    await postCards.last().scrollIntoViewIfNeeded();

    // Wait for the next page of data to load
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/rest/v1/posts') &&
        response.status() === 200,
      { timeout: 10000 },
    );

    // Trigger scroll to fire intersection observer
    await page.mouse.wheel(0, 500);

    await responsePromise;

    // Wait for new posts to render
    await page.waitForTimeout(1000);

    // Verify more posts appeared
    const newCount = await postCards.count();
    expect(newCount).toBeGreaterThan(initialCount);
  });
});
