import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const EDITOR_URL = '/test/editor';
const EDITOR_AREA = '[data-testid="editor-area"]';
const EDITOR_OUTPUT = '[data-testid="editor-output"]';

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

// Setup: mock Supabase Storage endpoints
async function setupMockUpload(page: import('@playwright/test').Page) {
  await page.route('**/storage/v1/object/**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Key: 'test/mock-image.jpg' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body: createTestImageBuffer(),
    });
  });

  await page.route('**/storage/v1/object/public/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/jpeg',
      body: createTestImageBuffer(),
    })
  );
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
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
    await page.click('[data-testid="toolbar-image"]');

    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
    // Cancel the file chooser (don't actually upload)
  });

  test.fixme('clipboard paste inserts image', async ({ page }) => {
    const editor = page.locator(EDITOR_AREA);
    await editor.click();

    const fileBuffer = fs.readFileSync(testImagePath);

    await editor.evaluate(
      async (el, { buffer }) => {
        const uint8 = new Uint8Array(buffer);
        const file = new File([uint8], 'pasted-image.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: dataTransfer,
          bubbles: true,
          cancelable: true,
        });
        el.dispatchEvent(pasteEvent);
      },
      { buffer: Array.from(fileBuffer) },
    );

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<img');
    }).toPass({ timeout: 15000 });
  });

  test.fixme('drag and drop inserts image', async ({ page }) => {
    const editor = page.locator(EDITOR_AREA);
    const fileBuffer = fs.readFileSync(testImagePath);

    await editor.evaluate(
      async (el, { buffer }) => {
        const uint8 = new Uint8Array(buffer);
        const file = new File([uint8], 'dropped-image.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        el.dispatchEvent(new DragEvent('dragenter', { dataTransfer, bubbles: true }));
        el.dispatchEvent(new DragEvent('dragover', { dataTransfer, bubbles: true }));
        el.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true }));
      },
      { buffer: Array.from(fileBuffer) },
    );

    await expect(async () => {
      const html = await page.locator(EDITOR_OUTPUT).innerHTML();
      expect(html).toContain('<img');
    }).toPass({ timeout: 15000 });
  });
});
