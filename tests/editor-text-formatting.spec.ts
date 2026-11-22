import { test, expect } from '@playwright/test';
import { modPress, modShiftPress, EDITOR_URL, EDITOR_AREA, EDITOR_OUTPUT } from './helpers/editor-helpers';

test.describe('Editor Text Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
  });

  test('underline formatting wraps text in <u>', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.click('[data-testid="toolbar-underline"]');
    await page.click(EDITOR_AREA);
    await page.keyboard.type('underlined text');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<u>');
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

  test('redo restores undone action', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('hello');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('hello');
    }).toPass({ timeout: 5000 });

    // Apply heading
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

    // Redo heading
    await modShiftPress(page, 'Z');
    await modShiftPress(page, 'Z');
    await page.keyboard.type(' ');
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<h1>');
    }).toPass({ timeout: 5000 });
  });
});
