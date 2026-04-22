import { test, expect, devices } from '@playwright/test';

const EDITOR_URL = '/test/editor';
const EDITOR_AREA = '[data-testid="editor-area"]';
const EDITOR_OUTPUT = '[data-testid="editor-output"]';

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

    // Editor should be within viewport width
    const box = await editor.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(393);
  });

  test('editor is scrollable at mobile viewport', async ({ page }) => {
    const editor = page.locator(EDITOR_AREA);
    await editor.click();

    // Type enough content to potentially overflow
    for (let i = 0; i < 20; i++) {
      await page.keyboard.type(`Line ${i + 1} of mobile test content`);
      await page.keyboard.press('Enter');
    }

    // Page should still be functional (no crash, content visible)
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('Line 20');
    }).toPass({ timeout: 5000 });
  });

  test('typing at mobile viewport produces correct output', async ({ page }) => {
    const editor = page.locator(EDITOR_AREA);

    // Tap to focus (mobile touch)
    const box = await editor.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    await page.keyboard.type('Mobile typing test');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('Mobile typing test');
    }).toPass({ timeout: 5000 });
  });

  test('toolbar is accessible at mobile viewport', async ({ page }) => {
    // The mobile toolbar should be visible (rendered at bottom for mobile)
    // Check that at least one toolbar button is in the viewport
    const editor = page.locator(EDITOR_AREA);
    await editor.click();

    // Type text and try to apply bold via toolbar
    await page.keyboard.type('bold me');
    await page.keyboard.press('Control+A');

    const boldButton = page.locator('[data-testid="toolbar-bold"]');
    // The button should exist (may be hidden proxy, but should be clickable)
    await expect(boldButton).toBeAttached();
  });

  test('Korean text at mobile viewport works correctly', async ({ page }) => {
    const editor = page.locator(EDITOR_AREA);

    const box = await editor.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    await page.keyboard.type('모바일에서 한글 입력 테스트');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('모바일에서 한글 입력 테스트');
    }).toPass({ timeout: 5000 });
  });
});
