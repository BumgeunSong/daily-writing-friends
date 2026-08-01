/**
 * Storage-rules verification against the local emulator.
 *
 * Run: `pnpm verify:storage-rules` with the emulator up
 * (`npx firebase emulators:start --only storage`, needs JDK 21+).
 *
 * Exercises the anonymous-client accept/reject matrix for the Supabase-auth
 * stopgap paths (postImages, profilePhotos, feedbackScreenshots) — see #593.
 */
import { initializeApp } from 'firebase/app';
import {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  listAll,
  updateMetadata,
} from 'firebase/storage';

const app = initializeApp({
  apiKey: 'fake-api-key',
  projectId: 'artico-app-4f9d4',
  storageBucket: 'artico-app-4f9d4.appspot.com',
});
const storage = getStorage(app);
connectStorageEmulator(storage, 'localhost', 9199);

const smallImage = new Uint8Array(8 * 1024).fill(1);
const bigImage = new Uint8Array(21 * 1024 * 1024).fill(1);
const runId = Date.now();

let failures = 0;

async function attempt(label, fn, expect) {
  try {
    await fn();
    const pass = expect === 'allow';
    if (!pass) failures += 1;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: allowed (expected ${expect})`);
  } catch (e) {
    const code = String(e.code || e.message);
    const denied = code.includes('unauthorized') || code.includes('unauthenticated');
    const pass = expect === 'deny' && denied;
    if (!pass) failures += 1;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: ${denied ? 'denied' : `error(${code})`} (expected ${expect})`);
  }
}

const postImage = `postImages/${runId}/ok.png`;
const profilePhoto = `profilePhotos/user-${runId}`;
const feedbackShot = `feedbackScreenshots/${runId}/s.png`;

await attempt('postImages create valid png', () =>
  uploadBytes(ref(storage, postImage), smallImage, { contentType: 'image/png' }), 'allow');
await attempt('postImages get (download url)', () =>
  getDownloadURL(ref(storage, postImage)), 'allow');
// Content overwrite is classified as `create` by the emulator (known
// divergence) — production classifies writes to an existing path as `update`.
// Metadata update is unambiguous, so it pins the `update: if false` rule.
await attempt('postImages updateMetadata', () =>
  updateMetadata(ref(storage, postImage), { cacheControl: 'no-store' }), 'deny');
await attempt('postImages create text/plain', () =>
  uploadBytes(ref(storage, `postImages/${runId}/evil.txt`), smallImage, { contentType: 'text/plain' }), 'deny');
await attempt('postImages create svg', () =>
  uploadBytes(ref(storage, `postImages/${runId}/evil.svg`), smallImage, { contentType: 'image/svg+xml' }), 'deny');
await attempt('postImages create 21MB png', () =>
  uploadBytes(ref(storage, `postImages/${runId}/big.png`), bigImage, { contentType: 'image/png' }), 'deny');
await attempt('postImages delete', () =>
  deleteObject(ref(storage, postImage)), 'deny');
await attempt('postImages list', () =>
  listAll(ref(storage, 'postImages')), 'deny');

await attempt('profilePhotos create valid jpeg', () =>
  uploadBytes(ref(storage, profilePhoto), smallImage, { contentType: 'image/jpeg' }), 'allow');
await attempt('profilePhotos update (re-upload same path)', () =>
  uploadBytes(ref(storage, profilePhoto), smallImage, { contentType: 'image/jpeg' }), 'allow');
await attempt('profilePhotos create octet-stream', () =>
  uploadBytes(ref(storage, `profilePhotos/user-${runId}-b`), smallImage, { contentType: 'application/octet-stream' }), 'deny');
await attempt('profilePhotos delete', () =>
  deleteObject(ref(storage, profilePhoto)), 'deny');
await attempt('profilePhotos list', () =>
  listAll(ref(storage, 'profilePhotos')), 'deny');

await attempt('feedbackScreenshots create valid png', () =>
  uploadBytes(ref(storage, feedbackShot), smallImage, { contentType: 'image/png' }), 'allow');
await attempt('feedbackScreenshots get (download url, app flow)', () =>
  getDownloadURL(ref(storage, feedbackShot)), 'allow');
await attempt('feedbackScreenshots updateMetadata', () =>
  updateMetadata(ref(storage, feedbackShot), { cacheControl: 'no-store' }), 'deny');
await attempt('feedbackScreenshots list', () =>
  listAll(ref(storage, 'feedbackScreenshots')), 'deny');

await attempt('unmatched path create png', () =>
  uploadBytes(ref(storage, `randomdir/${runId}.png`), smallImage, { contentType: 'image/png' }), 'deny');

console.log(failures === 0 ? '\nAll storage-rules scenarios passed.' : `\n${failures} scenario(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
