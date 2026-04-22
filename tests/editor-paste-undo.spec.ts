import { test, expect } from '@playwright/test';

const EDITOR_URL = '/test/editor';
const EDITOR_AREA = '[data-testid="editor-area"]';
const EDITOR_OUTPUT = '[data-testid="editor-output"]';

test.describe('Editor Paste and Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
  });

  test('paste plain text appears without extra formatting', async ({ page }) => {
    const editor = page.locator(EDITOR_AREA);
    await editor.click();

    // Paste plain text via clipboard API
    await editor.evaluate((el) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', 'Pasted plain text');
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(pasteEvent);
    });

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('Pasted plain text');
    }).toPass({ timeout: 5000 });
  });

  test('paste formatted HTML preserves bold and italic', async ({ page }) => {
    const editor = page.locator(EDITOR_AREA);
    await editor.click();

    await editor.evaluate((el) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/html', '<p><strong>Bold</strong> and <em>italic</em> text</p>');
      dataTransfer.setData('text/plain', 'Bold and italic text');
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(pasteEvent);
    });

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('Bold');
      expect(html).toContain('italic');
    }).toPass({ timeout: 5000 });
  });

  test('undo removes typed text', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('some text to undo');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('some text to undo');
    }).toPass({ timeout: 5000 });

    // Undo
    await page.keyboard.press('Control+Z');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).not.toContain('some text to undo');
    }).toPass({ timeout: 5000 });
  });

  test('redo restores undone text', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('redo this text');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('redo this text');
    }).toPass({ timeout: 5000 });

    // Undo
    await page.keyboard.press('Control+Z');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).not.toContain('redo this text');
    }).toPass({ timeout: 5000 });

    // Redo
    await page.keyboard.press('Control+Shift+Z');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('redo this text');
    }).toPass({ timeout: 5000 });
  });
});
