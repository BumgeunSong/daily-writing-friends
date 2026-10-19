import { test, expect, TEST_USERS } from './fixtures/auth';

/**
 * E2E tests for client-side avatar resize pipeline.
 *
 * Hermetic by design: Supabase Storage upload and public-URL requests are
 * intercepted via page.route so the test does NOT depend on a Storage bucket.
 * What we actually want to verify is:
 *   - The blob the app sends to Storage is a 256x256 JPEG (resize worked)
 *   - The upload request carries `cacheControl` = 2592000 seconds
 *   - The preview swaps from the local blob: URL to the returned public URL
 *   - The rendered <img> uses loading="lazy"
 *   - Files > 20 MB surface the Korean too-large message before any upload
 *
 * Covers tasks: T.20 + T.21 + T.23 + T.25.
 */

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const UPLOAD_URL_PATTERN = '**/storage/v1/object/profile-photos/**';
const PUBLIC_URL_PATTERN = '**/storage/v1/object/public/profile-photos/**';
const PUBLIC_URL_FRAGMENT = '/storage/v1/object/public/profile-photos/';
const CORS_HEADERS = { 'access-control-allow-origin': '*' };

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

// supabase-js sends one multipart POST to /storage/v1/object/{bucket}/{path}
// (FormData: `cacheControl` field + the file part) and builds the public URL
// locally, so the app never requests it until the <img> loads. We capture the
// upload, answer it, and serve the captured (resized) blob at the public URL.
async function mockSupabaseStorage(page: import('@playwright/test').Page) {
  const captured: { upload?: CapturedUpload; resizedBlob?: Buffer; publicUrl?: string } = {};

  await page.route(UPLOAD_URL_PATTERN, async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { ...CORS_HEADERS, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      return;
    }
    if (!captured.upload) {
      const buf = req.postDataBuffer();
      captured.upload = { body: buf ?? Buffer.alloc(0), headers: req.headers() };
      captured.resizedBlob = extractJpegFromMultipart(captured.upload.body);
    }
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json', ...CORS_HEADERS },
      body: JSON.stringify({ Id: 'e2e-mock-id', Key: 'profile-photos/e2e-mock' }),
    });
  });

  await page.route(PUBLIC_URL_PATTERN, async (route) => {
    captured.publicUrl = route.request().url();
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'image/jpeg',
        'cache-control': 'public, max-age=2592000',
        ...CORS_HEADERS,
      },
      body: captured.resizedBlob ?? Buffer.alloc(0),
    });
  });

  return captured;
}

/**
 * Supabase multipart upload body shape (FormData):
 *   ------boundary
 *   Content-Disposition: form-data; name="cacheControl"
 *
 *   2592000
 *   ------boundary
 *   Content-Disposition: form-data; name=""; filename="blob"
 *   Content-Type: image/jpeg
 *
 *   <binary JPEG bytes>
 *   ------boundary--
 *
 * We carve out the JPEG by finding the SOI marker (FF D8 FF) and taking bytes
 * through the last EOI (FF D9).
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
    const captured = await mockSupabaseStorage(page);

    await gotoEditAccount(page);
    await pickFile(page, SMALL_PNG_FIXTURE);

    // Preview swaps from the immediate blob: URL to the Supabase public URL
    // once uploadUserProfilePhoto resolves.
    const avatarImg = page.locator(`${AVATAR_BUTTON} img`);
    await expect
      .poll(async () => await avatarImg.getAttribute('src'), { timeout: 15_000 })
      .toContain(PUBLIC_URL_FRAGMENT);
    const publicUrl = (await avatarImg.getAttribute('src')) ?? '';

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
    }, publicUrl);

    expect(probe.width).toBe(256);
    expect(probe.height).toBe(256);
    expect(probe.blobType).toBe('image/jpeg');
    expect(probe.cacheControl).toBe('public, max-age=2592000');
    expect(probe.sizeKB).toBeLessThan(50);

    // T.25 client-side: confirm the upload carried the cache-control form
    // field and a JPEG file part.
    const bodyText = captured.upload?.body.toString('latin1') ?? '';
    expect(bodyText).toMatch(/name="cacheControl"\r\n\r\n2592000\r\n/);
    expect(bodyText).toContain('Content-Type: image/jpeg');
  });

  test('T.23: oversized file (>20 MB) surfaces the Korean too-large message', async ({ page }) => {
    await mockSupabaseStorage(page);

    await gotoEditAccount(page);
    await pickFile(page, OVERSIZED_FIXTURE);

    await expect(page.getByRole('alert')).toContainText('20MB 이하의 사진을 사용해주세요');
  });
});
