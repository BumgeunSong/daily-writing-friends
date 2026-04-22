import { test, expect } from '@playwright/test';
import { modPress, getTextContent, EDITOR_URL, EDITOR_AREA, EDITOR_OUTPUT } from './helpers/editor-helpers';

test.describe('Editor Paste and Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
  });

  test('typed text appears in output', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('Hello from paste test');
    await expect(async () => {
      const text = await getTextContent(page.locator(EDITOR_OUTPUT));
      expect(text).toContain('Hello from paste test');
    }).toPass({ timeout: 5000 });
  });

  test('undo removes last typed batch', async ({ page }) => {
    await page.click(EDITOR_AREA);
    // QUILL-SPECIFIC: 1s pause creates separate undo batches in Quill's time-based history
    await page.keyboard.type('first');
    await page.waitForTimeout(1000);
    await page.keyboard.type(' second');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('second');
    }).toPass({ timeout: 5000 });

    // Undo last batch
    await modPress(page, 'Z');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).not.toContain('second');
    }).toPass({ timeout: 5000 });
  });

  test('redo restores undone text', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('first');
    await page.waitForTimeout(1000);
    await page.keyboard.type(' second');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('second');
    }).toPass({ timeout: 5000 });

    await modPress(page, 'Z');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).not.toContain('second');
    }).toPass({ timeout: 5000 });

    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+Shift+Z`);
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('second');
    }).toPass({ timeout: 5000 });
  });
});
