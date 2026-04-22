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
  });

  test('editor accepts input at mobile viewport', async ({ page }) => {
    // Click to focus (mouse click works even on mobile viewport emulation)
    await page.click(EDITOR_AREA);
    // Type enough content to fill the viewport
    for (let i = 0; i < 10; i++) {
      await page.keyboard.type(`Line ${i + 1}`);
      await page.keyboard.press('Enter');
    }

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('Line 10');
    }).toPass({ timeout: 5000 });
  });

  test('typing at mobile viewport produces correct output', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('Mobile typing test');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('Mobile typing test');
    }).toPass({ timeout: 5000 });
  });

  test('toolbar buttons are present at mobile viewport', async ({ page }) => {
    // Verify toolbar buttons exist
    const boldButton = page.locator('[data-testid="toolbar-bold"]');
    await expect(boldButton).toBeAttached();

    const imageButton = page.locator('[data-testid="toolbar-image"]');
    await expect(imageButton).toBeAttached();
  });

  test('Korean text at mobile viewport works correctly', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('모바일에서 한글 입력 테스트');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('모바일에서 한글 입력 테스트');
    }).toPass({ timeout: 5000 });
  });
});
