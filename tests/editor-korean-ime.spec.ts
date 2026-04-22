import { test, expect } from '@playwright/test';
import { imeCompose, imeType } from './helpers/ime-helper';
import { modPress } from './helpers/editor-helpers';

const EDITOR_URL = '/test/editor';
const EDITOR_AREA = '[data-testid="editor-area"]';
const EDITOR_OUTPUT = '[data-testid="editor-output"]';

// Korean IME tests require CDP — skip on non-Chromium browsers
test.skip(({ browserName }) => browserName !== 'chromium', 'CDP required for IME simulation');

test.describe('Editor Korean IME', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
    await page.click(EDITOR_AREA);
  });

  // --- Line break bug tests (the original reported bug) ---

  test('Korean + ")" does not create unwanted line break', async ({ page }) => {
    await imeCompose(page, '안녕하세요', ')');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      const paragraphCount = (html.match(/<p[ >]/g) || []).length;
      expect(paragraphCount).toBeLessThanOrEqual(1);
      expect(html).toContain('안녕하세요');
      expect(html).toContain(')');
    }).toPass({ timeout: 5000 });
  });

  test('Korean + "/" does not create unwanted line break', async ({ page }) => {
    await imeCompose(page, '테스트', '/');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      const paragraphCount = (html.match(/<p[ >]/g) || []).length;
      expect(paragraphCount).toBeLessThanOrEqual(1);
      expect(html).toContain('테스트');
      expect(html).toContain('/');
    }).toPass({ timeout: 5000 });
  });

  test('Korean + "..." does not create unwanted line break', async ({ page }) => {
    await imeCompose(page, '그런데', '.');
    await page.keyboard.type('..');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      const paragraphCount = (html.match(/<p[ >]/g) || []).length;
      expect(paragraphCount).toBeLessThanOrEqual(1);
      expect(html).toContain('그런데');
    }).toPass({ timeout: 5000 });
  });

  // --- Common punctuation stability ---

  const punctuationChars = ['.', ',', '!', '?', '"', "'"];
  for (const char of punctuationChars) {
    test(`Korean + "${char}" does not create unwanted line break`, async ({ page }) => {
      await imeCompose(page, '한글', char);

      await expect(async () => {
        const html = await page.locator(EDITOR_OUTPUT).innerHTML();
        const paragraphCount = (html.match(/<p[ >]/g) || []).length;
        expect(paragraphCount).toBeLessThanOrEqual(1);
        expect(html).toContain('한글');
      }).toPass({ timeout: 5000 });
    });
  }

  // --- Korean composition basics ---

  test('Korean syllable composition produces correct text', async ({ page }) => {
    await imeType(page, '가나다라마');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('가나다라마');
    }).toPass({ timeout: 5000 });
  });

  test('Korean + Enter creates new paragraph', async ({ page }) => {
    await imeType(page, '첫번째 줄');
    await page.keyboard.press('Enter');
    await page.keyboard.type('두번째 줄');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('첫번째 줄');
      expect(html).toContain('두번째 줄');
      // Should have at least 2 blocks (paragraphs or other block elements)
      const blockCount = (html.match(/<(p|h[1-6]|li|blockquote)[ >]/g) || []).length;
      expect(blockCount).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 5000 });
  });

  // --- Mixed input ---

  test('Korean then English in same paragraph — no break', async ({ page }) => {
    await imeType(page, '안녕 ');
    await page.keyboard.type('hello');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      const paragraphCount = (html.match(/<p[ >]/g) || []).length;
      expect(paragraphCount).toBeLessThanOrEqual(1);
      expect(html).toContain('안녕');
      expect(html).toContain('hello');
    }).toPass({ timeout: 5000 });
  });

  test('English then Korean — no break', async ({ page }) => {
    await page.keyboard.type('hello ');
    await imeType(page, '세계');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      const paragraphCount = (html.match(/<p[ >]/g) || []).length;
      expect(paragraphCount).toBeLessThanOrEqual(1);
      expect(html).toContain('hello');
      expect(html).toContain('세계');
    }).toPass({ timeout: 5000 });
  });

  test('rapid Korean/English alternation — no phantom line breaks', async ({ page }) => {
    await imeType(page, '가');
    await page.keyboard.type('A');
    await imeType(page, '나');
    await page.keyboard.type('B');
    await imeType(page, '다');
    await page.keyboard.type('C');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      const paragraphCount = (html.match(/<p[ >]/g) || []).length;
      expect(paragraphCount).toBeLessThanOrEqual(1);
    }).toPass({ timeout: 5000 });
  });

  test('Korean text with bold formatting preserved', async ({ page }) => {
    await imeType(page, '볼드 테스트');
    await modPress(page, 'A');
    await modPress(page, 'B');
    // Type a space to trigger onChange
    await page.keyboard.press('End');
    await page.keyboard.type(' ');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<strong>');
      expect(html).toContain('볼드 테스트');
    }).toPass({ timeout: 5000 });
  });
});
