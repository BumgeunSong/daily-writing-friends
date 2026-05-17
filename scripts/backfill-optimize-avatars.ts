#!/usr/bin/env -S npx tsx

/**
 * Backfill: set Cache-Control metadata on existing avatar files in Firebase Storage.
 *
 * The `client-side-avatar-resize` change sets Cache-Control on NEW uploads.
 * This script applies the same header to existing files under `profilePhotos/`
 * so the browser HTTP cache reuses bytes across sessions for legacy avatars too.
 *
 * Dry-run on production showed the existing files are already small (~3–6 KB)
 * because earlier uploads were either Google-CDN avatars or small originals.
 * So resizing them would inflate, not shrink — this script only fixes the
 * missing Cache-Control header.
 *
 * `file.setMetadata()` is a metadata-only update: it does NOT rotate the
 * Firebase download token, so URLs stored in `users.profile_photo_url` stay
 * valid. No Supabase write is required.
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to Firebase service account JSON
 *     (or `gcloud auth application-default login` for ADC).
 *
 * Usage:
 *   npx tsx scripts/backfill-optimize-avatars.ts --dry-run
 *   npx tsx scripts/backfill-optimize-avatars.ts --limit 5
 *   npx tsx scripts/backfill-optimize-avatars.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { createRequire } from 'module';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BUCKET_NAME = 'artico-app-4f9d4.firebasestorage.app';
const PREFIX = 'profilePhotos/';
// Mirror apps/web/src/shared/utils/storageConstants.ts
const AVATAR_CACHE_CONTROL = 'public, max-age=2592000';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => {
  const i = args.indexOf('--limit');
  if (i < 0 || i + 1 >= args.length) return undefined;
  return Number.parseInt(args[i + 1], 10);
})();

function initFirebase() {
  if (getApps().length > 0) return;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp({ projectId: 'artico-app-4f9d4' });
  }
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

async function main() {
  initFirebase();

  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== BACKFILL START ===');
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Target Cache-Control: ${AVATAR_CACHE_CONTROL}`);
  if (typeof LIMIT === 'number') console.log(`Limit: ${LIMIT}`);
  console.log('');

  const bucket = getStorage().bucket(BUCKET_NAME);
  const [allFiles] = await bucket.getFiles({ prefix: PREFIX });
  const files = allFiles.filter((f) => !f.name.endsWith('/'));
  const targets = typeof LIMIT === 'number' ? files.slice(0, LIMIT) : files;
  console.log(`Found ${files.length} file(s) under ${PREFIX}; processing ${targets.length}\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of targets) {
    try {
      const [metadata] = await file.getMetadata();
      const size = typeof metadata.size === 'string' ? Number.parseInt(metadata.size, 10) : (metadata.size ?? 0);
      const currentCC = metadata.cacheControl;

      if (currentCC === AVATAR_CACHE_CONTROL) {
        skipped++;
        console.log(`skip ${file.name}  (already set, ${formatBytes(size)})`);
        continue;
      }

      if (DRY_RUN) {
        updated++;
        console.log(
          `[dry-run] ${file.name}  ${formatBytes(size)}  cacheControl: ${currentCC ?? '(none)'} -> ${AVATAR_CACHE_CONTROL}`,
        );
        continue;
      }

      await file.setMetadata({ cacheControl: AVATAR_CACHE_CONTROL });
      updated++;
      console.log(`set  ${file.name}  ${formatBytes(size)}  cacheControl: ${currentCC ?? '(none)'} -> ${AVATAR_CACHE_CONTROL}`);
    } catch (err) {
      failed++;
      console.error(`FAIL ${file.name}  error=${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\n=== DONE ===');
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);

  if (DRY_RUN) {
    console.log('\nRun without --dry-run to execute.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
