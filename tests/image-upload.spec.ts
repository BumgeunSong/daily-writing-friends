import { test, expect } from './fixtures/auth';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * E2E tests for Quill editor image upload features.
 *
 * Prerequisites:
 * - Firebase emulators running (auth + storage)
 * - Test user seeded with access to a board
 * - Dev server running on localhost:5173
 *
 * These tests create a small test image on disk, then exercise:
 * - Toolbar button upload (regression)
 * - Multi-file upload
 * - Drag & drop
 * - Clipboard paste
 */

const TEST_BOARD_ID = 'test-board-1';
const EDITOR_SELECTOR = '.ql-editor';
const TOOLBAR_IMAGE_BUTTON = '.ql-toolbar .ql-image';

// Create a minimal valid JPEG (1x1 pixel) for testing
function createTestImageBuffer(): Buffer {
  // Minimal JPEG: 1x1 white pixel
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

let testImagePath: string;

test.beforeAll(() => {
  // Write test image to artifacts directory
  const artifactsDir = path.join(__dirname, 'artifacts');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
  testImagePath = path.join(artifactsDir, 'test-image.jpg');
  fs.writeFileSync(testImagePath, createTestImageBuffer());
});

test.afterAll(() => {
  // Clean up test image
  if (testImagePath && fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
  }
});

test.describe('Image Upload - Editor', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to post creation page
    await page.goto(`/create/${TEST_BOARD_ID}`);
    // Wait for Quill editor to be ready
    await page.waitForSelector(EDITOR_SELECTOR, { timeout: 10000 });
  });

  test('T.9 Regression: toolbar image button → file select → upload → image displayed', async ({
    page,
  }) => {
    // Click editor to focus
    await page.click(EDITOR_SELECTOR);

    // Intercept file chooser when toolbar image button is clicked
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click(TOOLBAR_IMAGE_BUTTON),
    ]);

    // Select test image file
    await fileChooser.setFiles(testImagePath);

    // Wait for image to appear in editor
    const editorImage = page.locator(`${EDITOR_SELECTOR} img`);
    await expect(editorImage).toBeVisible({ timeout: 15000 });

    // Verify image has a valid URL (works with both production and emulator)
    const src = await editorImage.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toMatch(/^https?:\/\//);
  });

  test('T.8 Multi-file: select 3 images → sequential upload → 3 images displayed', async ({
    page,
  }) => {
    // Create additional test images
    const artifactsDir = path.join(__dirname, 'artifacts');
    const imagePaths = [testImagePath];
    for (let i = 2; i <= 3; i++) {
      const extraPath = path.join(artifactsDir, `test-image-${i}.jpg`);
      fs.writeFileSync(extraPath, createTestImageBuffer());
      imagePaths.push(extraPath);
    }

    await page.click(EDITOR_SELECTOR);

    // Intercept file chooser and select multiple files
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click(TOOLBAR_IMAGE_BUTTON),
    ]);

    await fileChooser.setFiles(imagePaths);

    // Wait for all 3 images to appear
    const editorImages = page.locator(`${EDITOR_SELECTOR} img`);
    await expect(editorImages).toHaveCount(3, { timeout: 30000 });

    // Clean up extra images
    for (let i = 2; i <= 3; i++) {
      const extraPath = path.join(artifactsDir, `test-image-${i}.jpg`);
      if (fs.existsSync(extraPath)) fs.unlinkSync(extraPath);
    }
  });

  test('T.6 Drag & drop: drop image file onto editor → upload → image displayed', async ({
    page,
  }) => {
    const editor = page.locator(EDITOR_SELECTOR);

    // Read file buffer for DataTransfer
    const fileBuffer = fs.readFileSync(testImagePath);

    // Create a DataTransfer with the test image and dispatch drop event
    await editor.evaluate(
      async (el, { buffer }) => {
        const uint8 = new Uint8Array(buffer);
        const file = new File([uint8], 'test-image.jpg', { type: 'image/jpeg' });

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        // Simulate drag sequence
        el.dispatchEvent(new DragEvent('dragenter', { dataTransfer, bubbles: true }));
        el.dispatchEvent(new DragEvent('dragover', { dataTransfer, bubbles: true }));
        el.dispatchEvent(new DragEvent('drop', { dataTransfer, bubbles: true }));
      },
      { buffer: Array.from(fileBuffer) },
    );

    // Wait for image to appear in editor
    const editorImage = page.locator(`${EDITOR_SELECTOR} img`);
    await expect(editorImage).toBeVisible({ timeout: 15000 });

    const src = await editorImage.getAttribute('src');
    expect(src).toBeTruthy();
  });

  test('T.7 Paste: clipboard image paste → upload → image displayed', async ({ page }) => {
    const editor = page.locator(EDITOR_SELECTOR);
    await editor.click();

    // Read file buffer for ClipboardEvent
    const fileBuffer = fs.readFileSync(testImagePath);

    // Dispatch paste event with image data
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

    // Wait for image to appear in editor
    const editorImage = page.locator(`${EDITOR_SELECTOR} img`);
    await expect(editorImage).toBeVisible({ timeout: 15000 });

    const src = await editorImage.getAttribute('src');
    expect(src).toBeTruthy();
  });
});
