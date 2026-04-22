import { test, expect } from '@playwright/test';
import { modPress } from './helpers/editor-helpers';

const EDITOR_URL = '/test/editor';
const EDITOR_AREA = '[data-testid="editor-area"]';
const EDITOR_OUTPUT = '[data-testid="editor-output"]';

test.describe('Editor Text Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
  });

  test('bold formatting wraps text in <strong>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello world');
    await modPress(page, 'A');
    await modPress(page, 'B');
    // Type a space to force onChange to fire with updated content
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<strong>');
    }).toPass({ timeout: 5000 });
  });

  test('italic formatting wraps text in <em>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello world');
    await modPress(page, 'A');
    await modPress(page, 'I');
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<em>');
    }).toPass({ timeout: 5000 });
  });

  test('underline formatting wraps text in <u>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello world');
    await modPress(page, 'A');
    await modPress(page, 'U');
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<u>');
    }).toPass({ timeout: 5000 });
  });

  test('strikethrough formatting wraps text in <s>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    // Type text with strikethrough already active via toolbar
    await page.click('[data-testid="toolbar-strike"]');
    await page.click(EDITOR_AREA);
    await page.keyboard.type('struck text');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
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
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('hello');
    }).toPass({ timeout: 5000 });

    // Apply bold then undo it
    await modPress(page, 'A');
    await page.keyboard.press('Control+B');
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<strong>');
    }).toPass({ timeout: 5000 });

    // Undo bold
    await modPress(page, 'Z');
    await modPress(page, 'Z');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).not.toContain('<strong>');
    }).toPass({ timeout: 5000 });
  });

  test('redo restores undone action', async ({ page }) => {
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
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+Shift+Z`);
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<h1>');
    }).toPass({ timeout: 5000 });
  });
});
