import { test, expect, AuthUtils } from './fixtures/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * E2E tests for client-side avatar resize pipeline.
 *
 * Prerequisites (same as image-upload.spec.ts):
 * - Firebase emulators running (auth + storage)
 * - Test user seeded with access to a board
 * - Dev server running on localhost:5173 against the emulator
 *
 * Covers (from openspec/changes/client-side-avatar-resize/tasks.md):
 *   T.20 Happy-path upload: file pick → preview updates → uploaded blob is 256x256 JPEG
 *   T.25 Uploaded file carries `cacheControl: public, max-age=2592000`
 *   T.21 Avatar render: every avatar `<img>` has `loading="lazy"`
 *   T.23 Oversize fallback: file > 20 MB surfaces the Korean error message
 */

const NON_TRIVIAL_JPEG_BASE64 =
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
  'A//Z';

let smallJpegPath: string;
let oversizedJpegPath: string;

test.beforeAll(() => {
  const artifactsDir = path.join(__dirname, 'artifacts');
  if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });

  smallJpegPath = path.join(artifactsDir, 'avatar-small.jpg');
  fs.writeFileSync(smallJpegPath, Buffer.from(NON_TRIVIAL_JPEG_BASE64, 'base64'));

  oversizedJpegPath = path.join(artifactsDir, 'avatar-oversize.jpg');
  // 21 MB of zeros — file.size > 20 MB triggers FileTooLargeError before any decode.
  fs.writeFileSync(oversizedJpegPath, Buffer.alloc(21 * 1024 * 1024));
});

test.afterAll(() => {
  for (const p of [smallJpegPath, oversizedJpegPath]) {
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
  }
});

async function gotoEditAccount(page: import('@playwright/test').Page): Promise<string> {
  const uid = await AuthUtils.getCurrentUserId(page);
  if (!uid) throw new Error('Test user is not signed in — check auth.setup.ts');
  await page.goto(`/account/edit/${uid}`);
  await page.getByRole('button', { name: '프로필 사진 변경' }).first().waitFor({ state: 'visible' });
  return uid;
}

test.describe('Client-side avatar resize', () => {
  test('T.20 + T.25: upload writes a 256x256 JPEG with Cache-Control set', async ({ page }) => {
    await gotoEditAccount(page);

    const previewImg = page.locator('img[alt]').first();
    const initialSrc = await previewImg.getAttribute('src');

    // The avatar wrapper <button> opens the hidden <input type='file'>.
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '프로필 사진 변경' }).first().click(),
    ]);
    await fileChooser.setFiles(smallJpegPath);

    // Preview swaps from the initial URL to the uploaded download URL.
    await expect
      .poll(async () => await previewImg.getAttribute('src'), { timeout: 15_000 })
      .not.toBe(initialSrc);

    const uploadedSrc = await previewImg.getAttribute('src');
    expect(uploadedSrc).toMatch(/^https?:\/\//);

    // Fetch the uploaded blob in-page (browser already has Storage auth context).
    const probe = await page.evaluate(async (url) => {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const bitmap = await createImageBitmap(blob);
      const result = {
        width: bitmap.width,
        height: bitmap.height,
        blobType: blob.type,
        cacheControl: resp.headers.get('cache-control'),
        sizeKB: Math.round(blob.size / 1024),
      };
      bitmap.close?.();
      return result;
    }, uploadedSrc!);

    expect(probe.width).toBe(256);
    expect(probe.height).toBe(256);
    expect(probe.blobType).toBe('image/jpeg');
    expect(probe.cacheControl).toBe('public, max-age=2592000');
    // 256x256 JPEG at q=0.85 is comfortably under 50 KB even for photo content.
    expect(probe.sizeKB).toBeLessThan(50);
  });

  test('T.23: oversized file (>20 MB) surfaces the Korean too-large message', async ({ page }) => {
    await gotoEditAccount(page);

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByRole('button', { name: '프로필 사진 변경' }).first().click(),
    ]);
    await fileChooser.setFiles(oversizedJpegPath);

    await expect(page.getByRole('alert')).toContainText('20MB 이하의 사진을 사용해주세요');
  });

  test('T.21: every rendered avatar <img> uses loading="lazy"', async ({ page }) => {
    // Any page that lists multiple users works for this assertion.
    await gotoEditAccount(page);

    // The avatar preview itself is the only guaranteed avatar here, but
    // ComposedAvatar is the single render path for all surfaces, so checking
    // the one rendered instance is sufficient to confirm the contract.
    const lazyLoaded = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
      const candidates = imgs.filter((i) => !!i.src && !i.src.startsWith('data:'));
      return {
        total: candidates.length,
        lazy: candidates.filter((i) => i.loading === 'lazy').length,
      };
    });

    expect(lazyLoaded.total).toBeGreaterThan(0);
    expect(lazyLoaded.lazy).toBe(lazyLoaded.total);
  });
});
