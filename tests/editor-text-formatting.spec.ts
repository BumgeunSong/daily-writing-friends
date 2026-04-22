import { test, expect } from '@playwright/test';

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
    // Select all text
    await page.keyboard.press('Control+A');
    // Click bold button
    await page.click('[data-testid="toolbar-bold"]');
    // Assert output contains <strong>
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<strong>');
    }).toPass({ timeout: 5000 });
  });

  test('italic formatting wraps text in <em>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello world');
    await page.keyboard.press('Control+A');
    await page.click('[data-testid="toolbar-italic"]');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<em>');
    }).toPass({ timeout: 5000 });
  });

  test('underline formatting wraps text in <u>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello world');
    await page.keyboard.press('Control+A');
    await page.click('[data-testid="toolbar-underline"]');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<u>');
    }).toPass({ timeout: 5000 });
  });

  test('strikethrough formatting wraps text in <s>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello world');
    await page.keyboard.press('Control+A');
    await page.click('[data-testid="toolbar-strike"]');
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

  test('undo reverses last action', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello');
    // Wait for text to appear in output
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('hello');
    }).toPass({ timeout: 5000 });

    // Undo
    await page.keyboard.press('Control+Z');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).not.toContain('hello');
    }).toPass({ timeout: 5000 });
  });

  test('redo restores undone action', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('hello');
    }).toPass({ timeout: 5000 });

    await page.keyboard.press('Control+Z');
    await page.keyboard.press('Control+Shift+Z');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('hello');
    }).toPass({ timeout: 5000 });
  });
});
