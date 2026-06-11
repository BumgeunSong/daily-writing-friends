import { test, expect } from './fixtures/auth';
import { imeType } from './helpers/ime-helper';

/**
 * E2E tests for the freewriting page typing-presence chip.
 *
 * Regression target: ProseMirror suppresses transactions during IME composition,
 * so Tiptap's onUpdate stays silent while a Korean syllable is being composed.
 * The chip flipped to "일시정지" mid-typing because the 2s pause timer expired
 * with no keepalive. The fix wires DOM-level beforeinput/compositionupdate
 * listeners that fire during composition; this spec proves the chip survives
 * sustained IME composition.
 */

const TEST_BOARD_ID = 'test-board-1';
const EDITOR_SELECTOR = '.ProseMirror';
const WRITING_LABEL = '쓰는 중';
const PAUSED_LABEL = '일시정지';

// The chip sits in the sticky header next to the elapsed-time readout. We
// match it via its label text so the assertion doesn't depend on Tailwind
// classes, which are shared with other rounded badges across the app.
const writingChip = (page: import('@playwright/test').Page) =>
  page.getByText(WRITING_LABEL, { exact: true }).first();
const pausedChip = (page: import('@playwright/test').Page) =>
  page.getByText(PAUSED_LABEL, { exact: true }).first();

test.describe('Freewriting timer chip', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto(`/create/${TEST_BOARD_ID}/free-writing`);
    await page.waitForSelector(EDITOR_SELECTOR, { timeout: 10000 });
    await page.click(EDITOR_SELECTOR);
  });

  test('stays in "쓰는 중" through sustained Korean IME composition (>2s)', async ({
    authenticatedPage: page,
  }) => {
    // Drive composition every 400ms for 4 seconds — well past the 2s pause
    // window. Without the DOM-level listener fix, Tiptap onUpdate is silent
    // during composition and the chip flips to "일시정지" mid-typing.
    const syllables = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차'];
    for (const syllable of syllables) {
      await imeType(page, syllable);
      await page.waitForTimeout(400);
      await expect(writingChip(page)).toBeVisible();
    }
  });

  test('flips to "일시정지" after 2s of no typing', async ({ authenticatedPage: page }) => {
    await imeType(page, '가');
    await expect(writingChip(page)).toBeVisible();

    // Idle long enough for the 2s pause timeout to expire.
    await page.waitForTimeout(2500);
    await expect(pausedChip(page)).toBeVisible();
  });
});
