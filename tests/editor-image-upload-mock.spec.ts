import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

import { EDITOR_URL, EDITOR_AREA, EDITOR_OUTPUT } from './helpers/editor-helpers';

// Create a minimal valid JPEG (1x1 pixel) for testing
function createTestImageBuffer(): Buffer {
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkS' +
    'Ew8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJ' +
    'CQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
    'MjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEA' +
    'AAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIh' +
    'MUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6' +
    'Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZ' +
    'mqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx' +
    '8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREA' +
    'AgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAV' +
    'YnLRChYkNOEl8RcYI4Q/RFhHRUMnN0JyciSCssT/2gAMAwEAAhEDEQA/AP0ooooo' +
    'A//Z',
    'base64',
  );
}

// Setup: mock Firebase Storage endpoints used by useImageUpload hook
async function setupMockUpload(page: import('@playwright/test').Page) {
  const mockObjectPath = 'postImages/20260422/120000_test-image.jpg';
  const mockDownloadToken = 'mock-download-token';

  const fulfillUpload = () => ({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      name: mockObjectPath,
      bucket: 'artico-app-4f9d4.firebasestorage.app',
      contentType: 'image/jpeg',
      downloadTokens: mockDownloadToken,
    }),
  });

  const fulfillImage = () => ({
    status: 200,
    contentType: 'image/jpeg',
    body: createTestImageBuffer(),
  });

  // Firebase Storage REST API (production)
  await page.route('**/firebasestorage.googleapis.com/**', (route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Download request (alt=media)
    if (url.includes('alt=media') || url.includes('token=')) {
      return route.fulfill(fulfillImage());
    }
    // Upload request (POST/PUT)
    if (method !== 'GET') {
      return route.fulfill(fulfillUpload());
    }
    // Metadata request
    return route.fulfill(fulfillUpload());
  });

  // Firebase Storage emulator (local dev)
  await page.route('**/127.0.0.1:*/v0/b/**', (route) => {
    if (route.request().method() !== 'GET') return route.fulfill(fulfillUpload());
    if (route.request().url().includes('alt=media')) return route.fulfill(fulfillImage());
    return route.fulfill(fulfillUpload());
  });
}

let testImagePath: string;

test.beforeAll(() => {
  const artifactsDir = path.join(__dirname, 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  testImagePath = path.join(artifactsDir, 'editor-test-image.jpg');
  fs.writeFileSync(testImagePath, createTestImageBuffer());
});

test.afterAll(() => {
  if (testImagePath && fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
  }
});

test.describe('Editor Image Upload (Mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockUpload(page);
    await page.goto(EDITOR_URL);
    await page.waitForSelector(EDITOR_AREA, { timeout: 10000 });
  });

  test('toolbar image button opens file chooser', async ({ page }) => {
    await page.click(EDITOR_AREA);

    // Verify that clicking the image button triggers a file chooser
    // Tiptap renders desktop + mobile toolbars — use .first() to avoid strict mode error
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
    await page.locator('[data-testid="toolbar-image"]').first().click();

    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
    // Cancel the file chooser (don't actually upload)
  });

  test('clipboard paste inserts image', async ({ page }) => {
    await page.click(EDITOR_AREA);

    const fileBuffer = fs.readFileSync(testImagePath);

    // Wait for Tiptap's paste/drop handlers to be attached (150ms timer in EditorTiptap)
    await page.waitForTimeout(200);

    // Synthetic ClipboardEvent ignores clipboardData in constructor — use Object.defineProperty
    // Must include getData/types so ProseMirror's internal paste handler doesn't throw
    await page.evaluate(
      async ({ buffer }) => {
        const editorEl = document.querySelector('[contenteditable="true"]');
        if (!editorEl) throw new Error('contenteditable not found');
        const uint8 = new Uint8Array(buffer);
        const file = new File([uint8], 'pasted-image.jpg', { type: 'image/jpeg' });

        const pasteEvent = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(pasteEvent, 'clipboardData', {
          value: {
            items: [{ type: 'image/jpeg', kind: 'file', getAsFile: () => file }],
            files: [file],
            types: ['Files'],
            getData: () => '',
            setData: () => {},
          },
        });
        editorEl.dispatchEvent(pasteEvent);
      },
      { buffer: Array.from(fileBuffer) },
    );

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<img');
    }).toPass({ timeout: 15000 });
  });

  test('drag and drop inserts image', async ({ page }) => {
    await page.click(EDITOR_AREA);
    const fileBuffer = fs.readFileSync(testImagePath);

    // Wait for Tiptap's drop handler to be attached
    await page.waitForTimeout(200);

    // Synthetic DragEvent ignores dataTransfer in constructor — use Object.defineProperty
    // Must include getData/types so ProseMirror's internal drop handler doesn't throw
    await page.evaluate(
      async ({ buffer }) => {
        const editorEl = document.querySelector('[contenteditable="true"]');
        if (!editorEl) throw new Error('contenteditable not found');
        const uint8 = new Uint8Array(buffer);
        const file = new File([uint8], 'dropped-image.jpg', { type: 'image/jpeg' });

        const mockDataTransfer = {
          items: [{ type: 'image/jpeg', kind: 'file', getAsFile: () => file }],
          files: [file],
          types: ['Files'],
          getData: () => '',
          setData: () => {},
          dropEffect: 'copy',
          effectAllowed: 'all',
        };

        for (const eventType of ['dragenter', 'dragover', 'drop'] as const) {
          const event = new DragEvent(eventType, { bubbles: true, cancelable: true });
          Object.defineProperty(event, 'dataTransfer', { value: mockDataTransfer });
          editorEl.dispatchEvent(event);
        }
      },
      { buffer: Array.from(fileBuffer) },
    );

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<img');
    }).toPass({ timeout: 15000 });
  });
});
