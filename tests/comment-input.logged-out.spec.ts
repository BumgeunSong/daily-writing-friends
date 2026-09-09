import { expect, test } from '@playwright/test';

const COMMENT_INPUT_URL = '/test/comment-input';
const FIRST_LINE = '첫째 줄';
const SECOND_LINE = '둘째 줄';
const BLOCKQUOTE_TEXT = '인용문';

test.describe('Comment Input Formatting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(COMMENT_INPUT_URL);
    await expect(page.getByRole('textbox', { name: '테스트 댓글 입력...' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('formats > space as a blockquote', async ({ page }) => {
    const commentInput = page.getByRole('textbox', { name: '테스트 댓글 입력...' });

    await commentInput.click();
    await page.keyboard.type('> ');
    await page.keyboard.type(BLOCKQUOTE_TEXT);

    await expect(async () => {
      const html = await commentInput.evaluate((element) => element.innerHTML);
      expect(html).toContain('<blockquote>');
      expect(html).toContain(BLOCKQUOTE_TEXT);
    }).toPass({ timeout: 5000 });

    await expect(page.getByTestId('submit-count')).toHaveText('0');
  });

  test('pressing Enter inserts a line break without submitting', async ({ page }) => {
    const commentInput = page.getByRole('textbox', { name: '테스트 댓글 입력...' });

    await commentInput.click();
    await page.keyboard.type(FIRST_LINE);
    await page.keyboard.press('Enter');
    await page.keyboard.type(SECOND_LINE);

    await expect(async () => {
      const html = await commentInput.evaluate((element) => element.innerHTML);
      expect(html).toContain('<br>');
      expect(html).toContain(FIRST_LINE);
      expect(html).toContain(SECOND_LINE);
    }).toPass({ timeout: 5000 });

    await expect(page.getByTestId('submit-count')).toHaveText('0');
  });

  test('pressing Shift+Enter inserts a line break without submitting', async ({ page }) => {
    const commentInput = page.getByRole('textbox', { name: '테스트 댓글 입력...' });

    await commentInput.click();
    await page.keyboard.type(FIRST_LINE);
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type(SECOND_LINE);

    await expect(async () => {
      const html = await commentInput.evaluate((element) => element.innerHTML);
      expect(html).toContain('<br>');
      expect(html).toContain(FIRST_LINE);
      expect(html).toContain(SECOND_LINE);
    }).toPass({ timeout: 5000 });

    await expect(page.getByTestId('submit-count')).toHaveText('0');
  });

  test('submits multiline content with line breaks intact via the send button', async ({ page }) => {
    const commentInput = page.getByRole('textbox', { name: '테스트 댓글 입력...' });

    await commentInput.click();
    await page.keyboard.type(FIRST_LINE);
    await page.keyboard.press('Enter');
    await page.keyboard.type(SECOND_LINE);

    await page.getByRole('button', { name: '댓글 등록' }).click();

    await expect(page.getByTestId('submit-count')).toHaveText('1');
    await expect(commentInput).toHaveText('');
    await expect(async () => {
      const html = await page.getByTestId('submitted-comment-output').evaluate((element) => element.innerHTML);
      expect(html).toContain('<br>');
      expect(html).toContain(FIRST_LINE);
      expect(html).toContain(SECOND_LINE);
    }).toPass({ timeout: 5000 });
    await expect(page.getByTestId('submitted-comment-json')).toContainText('"type":"doc"');
  });
});
