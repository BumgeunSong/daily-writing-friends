import { test, expect } from '@playwright/test';

import { EDITOR_URL, EDITOR_AREA, EDITOR_OUTPUT } from './helpers/editor-helpers';

// 1x1 PNG. It must decode: the upload pipeline re-encodes the image before uploading and
// refuses to upload bytes it cannot decode, so a truncated fixture never reaches the bucket.
const TEST_IMAGE_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const UPLOAD_URL_PATTERN = '**/storage/v1/object/post-images/**';
const PUBLIC_URL_PATTERN = '**/storage/v1/object/public/post-images/**';
const CORS_HEADERS = { 'access-control-allow-origin': '*' };
const UPLOAD_REQUEST_PATH = /\/storage\/v1\/object\/post-images\/[0-9a-f-]{36}\//;
const PUBLIC_IMAGE_SRC = /\/storage\/v1\/object\/public\/post-images\/[0-9a-f-]{36}\//;

const waitForUploadRequest = (page: import('@playwright/test').Page) =>
  page.waitForRequest((req) => req.method() === 'POST' && UPLOAD_REQUEST_PATH.test(req.url()));

// The inserted image must point at the bucket's public URL and actually load through it.
async function expectUploadedImageInserted(page: import('@playwright/test').Page) {
  const image = page.locator(`${EDITOR_AREA} img`);
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute('src', PUBLIC_IMAGE_SRC);
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
}

// The editor uploads through supabase-js: one multipart POST to
// /storage/v1/object/post-images/{uid}/{file}, then builds the public URL locally.
// Answer the upload and serve a tiny PNG at the public URL so no real bucket is needed.
async function setupMockUpload(page: import('@playwright/test').Page) {
  await page.route(UPLOAD_URL_PATTERN, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: { ...CORS_HEADERS, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ Id: 'e2e-mock-id', Key: 'post-images/e2e-mock' }),
    });
  });

  await page.route(PUBLIC_URL_PATTERN, (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'image/png', ...CORS_HEADERS },
      body: TEST_IMAGE_BUFFER,
    }),
  );
}

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

    const fileBuffer = TEST_IMAGE_BUFFER;

    // Wait for Tiptap's paste/drop handlers to be attached (signaled by data attribute)
    await page.waitForSelector('[data-image-handlers="ready"]', { timeout: 5000 });
    const uploadRequest = waitForUploadRequest(page);

    // Synthetic ClipboardEvent ignores clipboardData in constructor — use Object.defineProperty
    // Must include getData/types so ProseMirror's internal paste handler doesn't throw
    await page.evaluate(
      async ({ buffer }) => {
        const editorEl = document.querySelector('[contenteditable="true"]');
        if (!editorEl) throw new Error('contenteditable not found');
        const uint8 = new Uint8Array(buffer);
        const file = new File([uint8], 'pasted-image.png', { type: 'image/png' });

        const pasteEvent = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
        Object.defineProperty(pasteEvent, 'clipboardData', {
          value: {
            items: [{ type: 'image/png', kind: 'file', getAsFile: () => file }],
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

    await uploadRequest;
    await expectUploadedImageInserted(page);
  });

  test('drag and drop inserts image', async ({ page }) => {
    await page.click(EDITOR_AREA);
    const fileBuffer = TEST_IMAGE_BUFFER;

    // Wait for Tiptap's drop handler to be attached (signaled by data attribute)
    await page.waitForSelector('[data-image-handlers="ready"]', { timeout: 5000 });
    const uploadRequest = waitForUploadRequest(page);

    // Synthetic DragEvent ignores dataTransfer in constructor — use Object.defineProperty
    // Must include getData/types so ProseMirror's internal drop handler doesn't throw
    await page.evaluate(
      async ({ buffer }) => {
        const editorEl = document.querySelector('[contenteditable="true"]');
        if (!editorEl) throw new Error('contenteditable not found');
        const uint8 = new Uint8Array(buffer);
        const file = new File([uint8], 'dropped-image.png', { type: 'image/png' });

        const mockDataTransfer = {
          items: [{ type: 'image/png', kind: 'file', getAsFile: () => file }],
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

    await uploadRequest;
    await expectUploadedImageInserted(page);
  });
});
