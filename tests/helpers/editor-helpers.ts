import type { Page } from '@playwright/test';

/**
 * Get the correct modifier key for the current platform.
 * Mac uses Meta (Command), other platforms use Control.
 */
export function getModKey(): string {
  return process.platform === 'darwin' ? 'Meta' : 'Control';
}

/**
 * Press a keyboard shortcut with the correct platform modifier.
 * e.g., modPress(page, 'B') → Meta+B on Mac, Control+B on Windows/Linux
 */
export async function modPress(page: Page, key: string): Promise<void> {
  await page.keyboard.press(`${getModKey()}+${key}`);
}
