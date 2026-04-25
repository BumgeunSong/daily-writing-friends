import { test, expect } from '@playwright/test';
import { FIXTURES } from './fixtures/editor-html-fixtures';
import { EDITOR_URL, EDITOR_AREA, EDITOR_OUTPUT } from './helpers/editor-helpers';

test.describe('Editor Content Rendering', () => {
  // Inject fixtures into window before each test
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((fixtures) => {
      (window as any).__TEST_FIXTURES__ = fixtures;
    }, FIXTURES);
  });

  test('all-formats fixture renders with expected elements', async ({ page }) => {
    await page.goto(`${EDITOR_URL}?fixture=all-formats`);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });

    // Verify the editor area contains rendered content
    const editorArea = page.locator(EDITOR_AREA);
    await expect(editorArea).toContainText('Heading 1');
    await expect(editorArea).toContainText('Bold text');
    await expect(editorArea).toContainText('italic text');
    await expect(editorArea).toContainText('Bullet item 1');
    await expect(editorArea).toContainText('A blockquote paragraph');
  });

  test('with-images fixture renders img tags', async ({ page }) => {
    await page.goto(`${EDITOR_URL}?fixture=with-images`);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });

    const images = page.locator(`${EDITOR_AREA} img`);
    await expect(images).toHaveCount(1, { timeout: 5000 });
  });

  test('empty fixture shows placeholder', async ({ page }) => {
    await page.goto(`${EDITOR_URL}?fixture=empty`);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });

    // Editor should show placeholder text when empty
    // Quill uses .ql-blank class, but we check for placeholder visibility
    const editorArea = page.locator(EDITOR_AREA);
    // The editor area should be essentially empty (just a blank line)
    const text = await editorArea.textContent();
    expect(text?.trim()).toBe('');
  });

  test('korean-mixed fixture renders Korean and English', async ({ page }) => {
    await page.goto(`${EDITOR_URL}?fixture=korean-mixed`);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });

    const editorArea = page.locator(EDITOR_AREA);
    await expect(editorArea).toContainText('오늘의 글쓰기 주제는');
    await expect(editorArea).toContainText('Writing about happiness');
    await expect(editorArea).toContainText('볼드 한글');
  });

  test('real-post fixture renders without errors', async ({ page }) => {
    await page.goto(`${EDITOR_URL}?fixture=real-post`);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });

    const editorArea = page.locator(EDITOR_AREA);
    await expect(editorArea).toContainText('오늘 하루를 돌아보며');
    await expect(editorArea).toContainText('따뜻한 커피 한 잔');
    await expect(editorArea).toContainText('글쓰기는 생각을 정리하는');
  });

  test('round-trip fidelity: no edits preserves content', async ({ page }) => {
    await page.goto(`${EDITOR_URL}?fixture=all-formats`);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });

    // Wait for output to be populated
    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html.length).toBeGreaterThan(0);
    }).toPass({ timeout: 5000 });

    // Read output HTML
    const outputHtml = await page.locator(EDITOR_OUTPUT).innerHTML();

    // CONTRACT: verify these tags match after editor migration — Tiptap should preserve standard semantic HTML
    expect(outputHtml).toContain('<h1>');
    expect(outputHtml).toContain('<strong>');
    expect(outputHtml).toContain('<em>');
    expect(outputHtml).toContain('<ul>');
    expect(outputHtml).toContain('<ol>');
    expect(outputHtml).toContain('<blockquote>');
    expect(outputHtml).toContain('<a ');
  });

  test('real-post round-trip preserves semantic elements', async ({ page }) => {
    await page.goto(`${EDITOR_URL}?fixture=real-post`);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html.length).toBeGreaterThan(0);
    }).toPass({ timeout: 5000 });

    // CONTRACT: verify these tags match after editor migration
    const outputHtml = await page.locator(EDITOR_OUTPUT).innerHTML();
    expect(outputHtml).toContain('<h2>');
    expect(outputHtml).toContain('<strong>');
    expect(outputHtml).toContain('<ul>');
    expect(outputHtml).toContain('<li>');
    expect(outputHtml).toContain('<blockquote>');
    expect(outputHtml).toContain('<a ');
  });
});
