import { test, expect } from '@playwright/test';
import { modPress } from './helpers/editor-helpers';

const EDITOR_URL = '/test/editor';
const EDITOR_AREA = '[data-testid="editor-area"]';
const EDITOR_OUTPUT = '[data-testid="editor-output"]';

test.describe('Editor Paste and Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
  });

  test('typed text appears in output', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('Hello from paste test');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('Hello from paste test');
    }).toPass({ timeout: 5000 });
  });

  test('undo removes last typed batch', async ({ page }) => {
    await page.click(EDITOR_AREA);
    // Type word by word with pauses so Quill creates separate undo batches
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
