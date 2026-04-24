import { test, expect } from '@playwright/test';
import { modPress, modShiftPress, EDITOR_URL, EDITOR_AREA, EDITOR_OUTPUT } from './helpers/editor-helpers';

test.describe('Editor Text Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
  });

  test('bold formatting wraps text in <strong>', async ({ page }) => {
    // Activate bold first, then type — same pattern as strikethrough test
    await page.click(EDITOR_AREA);
    await page.click('[data-testid="toolbar-bold"]');
    await page.click(EDITOR_AREA);
    await page.keyboard.type('bold text');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<strong>');
    }).toPass({ timeout: 5000 });
  });

  test('italic formatting wraps text in <em>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.click('[data-testid="toolbar-italic"]');
    await page.click(EDITOR_AREA);
    await page.keyboard.type('italic text');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<em>');
    }).toPass({ timeout: 5000 });
  });

  // FIXME: Cmd+U is intercepted by Chromium (view-source shortcut) and no underline toolbar button exists.
  // Re-enable after adding an underline button to EditorToolbar, or test manually.
  test.fixme('underline formatting wraps text in <u>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await modPress(page, 'U');
    await page.keyboard.type('underlined text');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<u>');
    }).toPass({ timeout: 5000 });
  });

  test('strikethrough formatting wraps text in <s>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.click('[data-testid="toolbar-strike"]');
    await page.click(EDITOR_AREA);
    await page.keyboard.type('struck text');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      // CONTRACT: Tiptap Strike uses <s> by default, but some configs use <del> — verify after migration
      expect(html).toContain('<s>');
    }).toPass({ timeout: 5000 });
  });

  test('heading 1 wraps line in <h1>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('My Heading');
    await page.click('[data-testid="toolbar-h1"]');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<h1>');
    }).toPass({ timeout: 5000 });
  });

  test('heading 2 wraps line in <h2>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('My Heading');
    await page.click('[data-testid="toolbar-h2"]');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<h2>');
    }).toPass({ timeout: 5000 });
  });

  test('blockquote wraps text in <blockquote>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('A quote');
    await page.click('[data-testid="toolbar-blockquote"]');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<blockquote>');
    }).toPass({ timeout: 5000 });
  });

  test('bullet list creates <ul><li> structure', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('Item 1');
    await page.click('[data-testid="toolbar-bullet-list"]');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<ul>');
      expect(html).toContain('<li>');
    }).toPass({ timeout: 5000 });
  });

  test('ordered list creates <ol><li> structure', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('Item 1');
    await page.click('[data-testid="toolbar-ordered-list"]');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<ol>');
      expect(html).toContain('<li>');
    }).toPass({ timeout: 5000 });
  });

  test('undo reverses formatting change', async ({ page }) => {
    // Apply heading via toolbar, then undo it
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('hello');
    }).toPass({ timeout: 5000 });

    await page.click('[data-testid="toolbar-h1"]');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<h1>');
    }).toPass({ timeout: 5000 });

    // Undo heading
    await modPress(page, 'Z');
    await modPress(page, 'Z');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).not.toContain('<h1>');
    }).toPass({ timeout: 5000 });
  });

  // FIXME: redo after toolbar-applied heading doesn't reliably trigger onChange
  test.fixme('redo restores undone action', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('hello');
    }).toPass({ timeout: 5000 });

    // Apply heading
    await page.click('[data-testid="toolbar-h1"]');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<h1>');
    }).toPass({ timeout: 5000 });

    // Undo heading
    await modPress(page, 'Z');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).not.toContain('<h1>');
    }).toPass({ timeout: 5000 });

    // Redo heading
    await modShiftPress(page, 'Z');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<h1>');
    }).toPass({ timeout: 5000 });
  });
});
