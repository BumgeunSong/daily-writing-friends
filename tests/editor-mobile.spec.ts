import { test, expect, devices } from '@playwright/test';
import { getTextContent, EDITOR_URL, EDITOR_AREA, EDITOR_OUTPUT } from './helpers/editor-helpers';

// Use mobile viewport for all tests in this suite
test.use({ ...devices['Pixel 5'] });

test.describe('Editor Mobile Viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
  });

  test('editor renders at mobile viewport', async ({ page }) => {
    const editor = page.locator(EDITOR_AREA);
    await expect(editor).toBeVisible();
  });

  test('editor accepts input at mobile viewport', async ({ page }) => {
    await page.click(EDITOR_AREA);
    for (let i = 0; i < 10; i++) {
      await page.keyboard.type(`Line ${i + 1}`);
      await page.keyboard.press('Enter');
    }

    await expect(async () => {
      const text = await getTextContent(page.locator(EDITOR_OUTPUT));
      expect(text).toContain('Line 10');
    }).toPass({ timeout: 5000 });
  });

  test('typing at mobile viewport produces correct output', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('Mobile typing test');

    await expect(async () => {
      const text = await getTextContent(page.locator(EDITOR_OUTPUT));
      expect(text).toContain('Mobile typing test');
    }).toPass({ timeout: 5000 });
  });

  test('toolbar buttons are present at mobile viewport', async ({ page }) => {
    // Verify toolbar buttons exist
    const boldButton = page.locator('[data-testid="toolbar-bold"]');
    await expect(boldButton).toBeAttached();

    const imageButton = page.locator('[data-testid="toolbar-image"]');
    await expect(imageButton).toBeAttached();
  });

  test('toolbar stays visible after scrolling long content', async ({ page }) => {
    await page.click(EDITOR_AREA);

    // Type enough content to force scrolling
    for (let i = 0; i < 30; i++) {
      await page.keyboard.type(`Line ${i + 1} of long content`);
      await page.keyboard.press('Enter');
    }

    // Scroll to bottom of editor
    await page.keyboard.press('End');

    // Toolbar should still be visible (sticky) even after scrolling
    const toolbar = page.locator('[data-testid="toolbar-bold"]');
    await expect(toolbar).toBeVisible({ timeout: 3000 });

    // Toolbar should not overlap with page header
    const toolbarBox = await toolbar.boundingBox();
    expect(toolbarBox).not.toBeNull();
    // Toolbar should be within viewport (y > 0 means not hidden above)
    expect(toolbarBox!.y).toBeGreaterThanOrEqual(0);
  });

  test('Korean text at mobile viewport works correctly', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('모바일에서 한글 입력 테스트');

    await expect(async () => {
      const text = await getTextContent(page.locator(EDITOR_OUTPUT));
      expect(text).toContain('모바일에서 한글 입력 테스트');
    }).toPass({ timeout: 5000 });
  });
});
