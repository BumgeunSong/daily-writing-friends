import { test, expect } from '@playwright/test';
import { imeCompose, imeType } from './helpers/ime-helper';
import { modPress, getTextContent, expectNoParagraphSplit, EDITOR_URL, EDITOR_AREA, EDITOR_OUTPUT } from './helpers/editor-helpers';

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
    await expectNoParagraphSplit(page);
    const html = await page.locator(EDITOR_OUTPUT).innerHTML();
    expect(html).toContain('안녕하세요');
    expect(html).toContain(')');
  });

  test('Korean + "/" does not create unwanted line break', async ({ page }) => {
    await imeCompose(page, '테스트', '/');
    await expectNoParagraphSplit(page);
    const html = await page.locator(EDITOR_OUTPUT).innerHTML();
    expect(html).toContain('테스트');
    expect(html).toContain('/');
  });

  test('Korean + "..." does not create unwanted line break', async ({ page }) => {
    await imeCompose(page, '그런데', '.');
    await page.keyboard.type('..');
    await expectNoParagraphSplit(page);
    const html = await page.locator(EDITOR_OUTPUT).innerHTML();
    expect(html).toContain('그런데');
  });

  // --- Common punctuation stability ---

  const punctuationChars = ['.', ',', '!', '?', '"', "'"];
  for (const char of punctuationChars) {
    test(`Korean + "${char}" does not create unwanted line break`, async ({ page }) => {
      await imeCompose(page, '한글', char);
      await expectNoParagraphSplit(page);
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('한글');
      expect(html).toContain(char);
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
    await imeType(page, '첫번째');
    await page.keyboard.press('Enter');
    await page.keyboard.type('두번째');

    await expect(async () => {
      const text = await getTextContent(page.locator(EDITOR_OUTPUT));
      expect(text).toContain('첫번째');
      expect(text).toContain('두번째');
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      const blockCount = (html.match(/<(p|h[1-6]|li|blockquote)[ >]/g) || []).length;
      expect(blockCount).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 5000 });
  });

  // --- Mixed input ---

  test('Korean then English in same paragraph — no break', async ({ page }) => {
    await imeType(page, '안녕 ');
    await page.keyboard.type('hello');
    await expectNoParagraphSplit(page);
    const html = await page.locator(EDITOR_OUTPUT).innerHTML();
    expect(html).toContain('안녕');
    expect(html).toContain('hello');
  });

  test('English then Korean — no break', async ({ page }) => {
    await page.keyboard.type('hello ');
    await imeType(page, '세계');
    await expectNoParagraphSplit(page);
    const html = await page.locator(EDITOR_OUTPUT).innerHTML();
    expect(html).toContain('hello');
    expect(html).toContain('세계');
  });

  test('rapid Korean/English alternation — no phantom line breaks', async ({ page }) => {
    await imeType(page, '가');
    await page.keyboard.type('A');
    await imeType(page, '나');
    await page.keyboard.type('B');
    await imeType(page, '다');
    await page.keyboard.type('C');
    await expectNoParagraphSplit(page);
  });

  test('Korean text with bold formatting preserved', async ({ page }) => {
    await imeType(page, '볼드테스트');
    await modPress(page, 'A');
    await modPress(page, 'B');
    await page.keyboard.press('End');
    await page.keyboard.type(' ');

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<strong>');
      const text = await getTextContent(page.locator(EDITOR_OUTPUT));
      expect(text).toContain('볼드테스트');
    }).toPass({ timeout: 5000 });
  });
});
