import { expect, type Page, type Locator } from '@playwright/test';

// Shared selectors — update these when changing editor test page
export const EDITOR_URL = '/test/editor';
export const EDITOR_AREA = '[data-testid="editor-area"]';
export const EDITOR_OUTPUT = '[data-testid="editor-output"]';

export function getModKey(): string {
  return process.platform === 'darwin' ? 'Meta' : 'Control';
}

export async function modPress(page: Page, key: string): Promise<void> {
  await page.keyboard.press(`${getModKey()}+${key}`);
}

export async function modShiftPress(page: Page, key: string): Promise<void> {
  await page.keyboard.press(`${getModKey()}+Shift+${key}`);
}

/**
 * Get text content with &nbsp; (U+00A0) normalized to regular spaces.
 * Rich text editors render spaces as &nbsp; which breaks string comparison.
 */
export async function getTextContent(locator: Locator): Promise<string> {
  const text = await locator.textContent() ?? '';
  return text.replace(/\u00a0/g, ' ');
}

/**
 * Assert the editor output contains only a single paragraph (no unwanted line breaks).
 * Also verifies the output is non-empty to prevent vacuous passes.
 */
export async function expectNoParagraphSplit(page: Page): Promise<void> {
  await expect(async () => {
    const html = await page.locator(EDITOR_OUTPUT).innerHTML();
    expect(html.length).toBeGreaterThan(0);
    const paragraphCount = (html.match(/<p[ >]/g) || []).length;
    expect(paragraphCount).toBeLessThanOrEqual(1);
  }).toPass({ timeout: 5000 });
}
