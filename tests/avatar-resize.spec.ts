import { test, expect, TEST_USERS } from './fixtures/auth';

/**
 * E2E tests for client-side avatar resize pipeline.
 *
 * Hermetic by design: Firebase Storage uploads are intercepted via page.route
 * so the test does NOT depend on Firebase emulator/production availability.
 * What we actually want to verify is:
 *   - The blob the app sends to Storage is a 256x256 JPEG (resize worked)
 *   - The upload request carries `cacheControl: public, max-age=2592000`
 *   - The preview swaps from the local blob: URL to the returned download URL
 *   - The rendered <img> uses loading="lazy"
 *   - Files > 20 MB surface the Korean too-large message before any upload
 *
 * Covers tasks: T.20 + T.21 + T.23 + T.25.
 */

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const STORAGE_BUCKET = 'artico-app-4f9d4.firebasestorage.app';
const STORAGE_HOST = 'firebasestorage.googleapis.com';
// Stable synthetic download URL returned by the mocked upload; the spec also
// intercepts GETs to this URL to serve the captured (resized) blob back.
const SYNTHETIC_DOWNLOAD_URL = `https://${STORAGE_HOST}/v0/b/${STORAGE_BUCKET}/o/profilePhotos%2Fe2e-mock?alt=media&token=mock-token`;

const AVATAR_BUTTON = 'button[aria-label="프로필 사진 변경"]';

// In-memory fixtures — no shared filesystem state so workers can run in parallel
// without racing on artifact files.
const SMALL_PNG_FIXTURE = {
  name: 'avatar-small.png',
  mimeType: 'image/png',
  buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
};

const OVERSIZED_FIXTURE = {
  name: 'avatar-oversize.png',
  mimeType: 'image/png',
  // 21 MB — exceeds the 20 MB pre-decode size cap; the payload bytes don't
  // need to be a valid image because FileTooLargeError fires before decode.
  buffer: Buffer.alloc(21 * 1024 * 1024),
};

interface CapturedUpload {
  body: Buffer;
  headers: Record<string, string>;
}

// The Firebase JS SDK sends one POST to /v0/b/{bucket}/o?... for an upload
// followed by zero or more GET/POST calls to finalize and to fetch the
// download URL. We accept any non-GET as the upload, capture once, then
// echo back a stable Firebase-shaped JSON response. The synthetic URL is
// what `getDownloadURL` will end up returning to the app.
async function mockFirebaseStorage(page: import('@playwright/test').Page) {
  const captured: { upload?: CapturedUpload; resizedBlob?: Buffer } = {};

  await page.route(`https://${STORAGE_HOST}/**`, async (route) => {
    const req = route.request();
    const url = req.url();

    if (req.method() === 'GET' && url.startsWith(SYNTHETIC_DOWNLOAD_URL)) {
      // Echo the resized blob back so the app can decode it for the preview
      // and the test can probe dimensions + Cache-Control via fetch().
      const body = captured.resizedBlob ?? Buffer.alloc(0);
      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'image/jpeg',
          'cache-control': 'public, max-age=2592000',
          'access-control-allow-origin': '*',
        },
        body,
      });
      return;
    }

    if (req.method() === 'GET') {
      // metadata + tokens endpoints — return a generic OK so getDownloadURL works
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
        body: JSON.stringify({
          downloadTokens: 'mock-token',
          bucket: STORAGE_BUCKET,
          name: 'profilePhotos/e2e-mock',
          contentType: 'image/jpeg',
        }),
      });
      return;
    }

    if (!captured.upload) {
      const buf = req.postDataBuffer();
      captured.upload = {
        body: buf ?? Buffer.alloc(0),
        headers: req.headers(),
      };
      captured.resizedBlob = extractJpegFromMultipart(captured.upload.body);
    }

    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        kind: 'storage#object',
        name: 'profilePhotos/e2e-mock',
        bucket: STORAGE_BUCKET,
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=2592000',
        size: String(captured.resizedBlob?.length ?? 0),
        downloadTokens: 'mock-token',
      }),
    });
  });

  return captured;
}

/**
 * Firebase multipart upload body shape:
 *   --boundary
 *   Content-Type: application/json; charset=utf-8
 *   { ...metadata... }
 *   --boundary
 *   Content-Type: image/jpeg
 *
 *   <binary JPEG bytes>
 *   --boundary--
 *
 * We carve out the JPEG by finding the SOI marker (FF D8 FF) after the second
 * Content-Type header and taking bytes through the next EOI (FF D9).
 */
function extractJpegFromMultipart(body: Buffer): Buffer {
  const soi = body.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
  if (soi === -1) return body;
  const eoi = body.lastIndexOf(Buffer.from([0xff, 0xd9]));
  if (eoi === -1 || eoi <= soi) return body.subarray(soi);
  return body.subarray(soi, eoi + 2);
}

async function gotoEditAccount(page: import('@playwright/test').Page) {
  const uid = TEST_USERS.REGULAR.uid;
  if (!uid) throw new Error('No e2e UID in fixtures/e2e-users.json — run the seed script first');
  await page.goto(`/account/edit/${uid}`);
  await page.locator(AVATAR_BUTTON).waitFor({ state: 'visible' });
}

type Fixture = { name: string; mimeType: string; buffer: Buffer };

async function pickFile(page: import('@playwright/test').Page, fixture: Fixture) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator(AVATAR_BUTTON).click(),
  ]);
  await fileChooser.setFiles(fixture);
}

test.describe('Client-side avatar resize', () => {
  test('happy path: 256x256 JPEG uploaded with Cache-Control, rendered lazy (T.20 + T.21 + T.25)', async ({
    page,
  }) => {
    const captured = await mockFirebaseStorage(page);

    await gotoEditAccount(page);
    await pickFile(page, SMALL_PNG_FIXTURE);

    // Preview swaps from the immediate blob: URL to the mocked download URL
    // once uploadUserProfilePhoto resolves.
    const avatarImg = page.locator(`${AVATAR_BUTTON} img`);
    await expect
      .poll(async () => await avatarImg.getAttribute('src'), { timeout: 15_000 })
      .toContain(SYNTHETIC_DOWNLOAD_URL);

    // T.21: every rendered avatar uses loading="lazy".
    await expect(avatarImg).toHaveAttribute('loading', 'lazy');

    // Probe the (mocked) download response inside the page context.
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
    }, SYNTHETIC_DOWNLOAD_URL);

    expect(probe.width).toBe(256);
    expect(probe.height).toBe(256);
    expect(probe.blobType).toBe('image/jpeg');
    expect(probe.cacheControl).toBe('public, max-age=2592000');
    expect(probe.sizeKB).toBeLessThan(50);

    // T.25 client-side: confirm the upload request carried the cacheControl
    // metadata. The Firebase SDK puts it in the JSON metadata part of the
    // multipart body.
    const bodyText = captured.upload?.body.toString('utf8') ?? '';
    expect(bodyText).toContain('"cacheControl":"public, max-age=2592000"');
    expect(bodyText).toContain('"contentType":"image/jpeg"');
  });

  test('T.23: oversized file (>20 MB) surfaces the Korean too-large message', async ({ page }) => {
    await mockFirebaseStorage(page);

    await gotoEditAccount(page);
    await pickFile(page, OVERSIZED_FIXTURE);

    await expect(page.getByRole('alert')).toContainText('20MB 이하의 사진을 사용해주세요');
  });
});
