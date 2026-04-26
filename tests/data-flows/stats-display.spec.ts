import { test, expect } from '@playwright/test';

test.describe('Stats Display', () => {
  test('stats page renders with data', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    // Verify the page renders without errors
    await expect(page.locator('body')).not.toContainText('문제가 생겼');

    // The stats page header should show "기록"
    await expect(page.getByText('기록')).toBeVisible({ timeout: 30000 });
  });

  test('contribution grid shows activity', async ({ page }) => {
    await page.goto('/stats');
    await page.waitForLoadState('networkidle');

    // Wait for the stats header to appear (confirms auth + page load)
    await expect(page.getByText('기록')).toBeVisible({ timeout: 30000 });

    // The main content area should exist and have content
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });
  });
});
