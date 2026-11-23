import { test, expect, devices } from '@playwright/test';
import { getTextContent, EDITOR_URL, EDITOR_AREA, EDITOR_OUTPUT } from './helpers/editor-helpers';

// Use mobile viewport for all tests in this suite
test.use({ ...devices['Pixel 5'] });

test.describe('Editor Mobile Viewport', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
  });

  test('editor renders at mobile viewport', async ({ page }) => {
    const editor = page.locator(EDITOR_AREA);
    await expect(editor).toBeVisible();
  });

  test('editor accepts input at mobile viewport', async ({ page }) => {
    await page.click(EDITOR_AREA);
    for (let i = 0; i < 10; i++) {
      await page.keyboard.type(`Line ${i + 1}`);
      await page.keyboard.press('Enter');
    }

    await expect(async () => {
      const text = await getTextContent(page.locator(EDITOR_OUTPUT));
      expect(text).toContain('Line 10');
    }).toPass({ timeout: 5000 });
  });

  test('typing at mobile viewport produces correct output', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('Mobile typing test');

    await expect(async () => {
      const text = await getTextContent(page.locator(EDITOR_OUTPUT));
      expect(text).toContain('Mobile typing test');
    }).toPass({ timeout: 5000 });
  });

  test('toolbar buttons are present at mobile viewport', async ({ page }) => {
    // Tiptap renders desktop + mobile toolbars — use .first() to avoid strict mode error
    const boldButton = page.locator('[data-testid="toolbar-bold"]').first();
    await expect(boldButton).toBeAttached();

    const imageButton = page.locator('[data-testid="toolbar-image"]').first();
    await expect(imageButton).toBeAttached();
  });

  test('긴 글을 쓰고 맨 위로 스크롤해도 서식 툴바는 화면에 남아 있다', async ({ page }) => {
    await page.click(EDITOR_AREA);

    // 화면을 넘길 만큼 길게 쓴다.
    for (let i = 0; i < 30; i++) {
      await page.keyboard.type(`Line ${i + 1} of long content`);
      await page.keyboard.press('Enter');
    }

    // 글 맨 위로 올리면 글 흐름 안에 있는 툴바는 화면 밖으로 밀려난다. 하단에 고정된 툴바만 남는다.
    await page.mouse.wheel(0, -10000);
    await expect(page.getByText('Line 1 of long content')).toBeInViewport();

    // Tiptap renders desktop + mobile toolbars — mobile toolbar is last
    await expect(page.locator('[data-testid="toolbar-bold"]').last()).toBeInViewport();
  });

  test('Korean text at mobile viewport works correctly', async ({ page }) => {
    await page.click(EDITOR_AREA);
    await page.keyboard.type('모바일에서 한글 입력 테스트');

    await expect(async () => {
      const text = await getTextContent(page.locator(EDITOR_OUTPUT));
      expect(text).toContain('모바일에서 한글 입력 테스트');
    }).toPass({ timeout: 5000 });
  });
});
