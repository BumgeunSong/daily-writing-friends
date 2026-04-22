import type { Page } from '@playwright/test';

// Map punctuation characters to their correct CDP key codes
const CHAR_TO_CODE: Record<string, string> = {
  ')': 'Digit0',
  '/': 'Slash',
  '.': 'Period',
  ',': 'Comma',
  '!': 'Digit1',
  '?': 'Slash',
  '"': 'Quote',
  "'": 'Quote',
};

/**
 * Simulate Korean IME composition via Chromium CDP.
 * Only works with Chromium-based browsers.
 */
export async function imeCompose(page: Page, composingText: string, commitChar: string) {
  const client = await page.context().newCDPSession(page);

  try {
    // 1. Start composition with Process key
    await client.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown', key: 'Process', code: '', windowsVirtualKeyCode: 229
    });
    await client.send('Input.imeSetComposition', {
      selectionStart: 0, selectionEnd: 0, text: composingText
    });

    // 2. Commit composition (triggers compositionend)
    await client.send('Input.insertText', { text: composingText });

    // 3. Type the triggering character
    const code = CHAR_TO_CODE[commitChar] ?? '';
    await client.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown', key: commitChar, code
    });
    await client.send('Input.insertText', { text: commitChar });
  } finally {
    await client.detach();
  }
}

/**
 * Simulate typing Korean text via IME without a commit character.
 */
export async function imeType(page: Page, text: string) {
  const client = await page.context().newCDPSession(page);

  try {
    await client.send('Input.dispatchKeyEvent', {
      type: 'rawKeyDown', key: 'Process', code: '', windowsVirtualKeyCode: 229
    });
    await client.send('Input.imeSetComposition', {
      selectionStart: 0, selectionEnd: 0, text
    });
    await client.send('Input.insertText', { text });
  } finally {
    await client.detach();
  }
}
