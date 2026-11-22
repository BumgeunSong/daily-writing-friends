import { expect, type Page, type Locator } from '@playwright/test';

// Shared selectors — update these when changing editor test page
export const EDITOR_URL = '/test/editor';
export const EDITOR_AREA = '[data-testid="editor-area"]';
export const EDITOR_OUTPUT = '[data-testid="editor-output"]';

/**
 * Control on every host. Desktop Chrome device emulation reports a non-Mac `navigator.platform`,
 * so the editor's Mod key is Ctrl even on a macOS host. On a macOS host Playwright also maps
 * Meta+Shift+Z to the native redo command instead of a keydown the page sees.
 */
export function getModKey(): string {
  return 'Control';
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
 * Assert the typed text landed in the editor output as one paragraph.
 * The output panel follows the editor through a debounced onChange, so this polls;
 * requiring the text keeps an empty output from passing as "no line break".
 */
export async function expectSingleParagraphWith(page: Page, ...texts: string[]): Promise<void> {
  await expect(async () => {
    const html = await page.locator(EDITOR_OUTPUT).innerHTML();
    for (const text of texts) expect(html).toContain(text);
    const paragraphCount = (html.match(/<p[ >]/g) || []).length;
    expect(paragraphCount).toBe(1);
    expect(html).not.toMatch(/<br/);
  }).toPass({ timeout: 5000 });
}
