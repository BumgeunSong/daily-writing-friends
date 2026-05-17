#!/usr/bin/env -S npx tsx

/**
 * Backfill: set Cache-Control metadata on existing files in Firebase Storage.
 *
 * New uploads (avatars via client-side-avatar-resize) set Cache-Control at
 * upload time. Files uploaded before that change have no Cache-Control header,
 * so the browser HTTP cache cannot reuse their bytes across sessions.
 *
 * `file.setMetadata()` is a metadata-only update: it does NOT rotate the
 * Firebase download token, so URLs stored in Supabase rows stay valid. No DB
 * write is required.
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to Firebase service account JSON
 *     (or `gcloud auth application-default login` for ADC).
 *
 * Usage:
 *   npx tsx scripts/backfill-cache-control.ts --prefix profilePhotos/ --dry-run
 *   npx tsx scripts/backfill-cache-control.ts --prefix postImages/   --dry-run
 *   npx tsx scripts/backfill-cache-control.ts --prefix postImages/   --limit 20
 *   npx tsx scripts/backfill-cache-control.ts --prefix postImages/
 *   npx tsx scripts/backfill-cache-control.ts --prefix postImages/ --concurrency 10
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
// Mirror apps/web/src/shared/utils/storageConstants.ts (avatars).
// Same 30-day TTL is used for post images: posts are immutable once written,
// so aggressive caching is safe.
const TARGET_CACHE_CONTROL = 'public, max-age=2592000';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

function getArgValue(flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

const PREFIX = getArgValue('--prefix');
const LIMIT = (() => {
  const v = getArgValue('--limit');
  return v ? Number.parseInt(v, 10) : undefined;
})();
const CONCURRENCY = (() => {
  const v = getArgValue('--concurrency');
  return v ? Math.max(1, Number.parseInt(v, 10)) : 1;
})();

if (!PREFIX) {
  console.error('ERROR: --prefix is required (e.g. --prefix profilePhotos/  or  --prefix postImages/)');
  process.exit(2);
}
if (!PREFIX.endsWith('/')) {
  console.error(`ERROR: --prefix must end with "/" (got "${PREFIX}")`);
  process.exit(2);
}

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

interface Counters {
  updated: number;
  skipped: number;
  failed: number;
  bytesAffected: number;
}

async function processFile(
  file: import('@google-cloud/storage').File,
  counters: Counters,
): Promise<void> {
  try {
    const [metadata] = await file.getMetadata();
    const size = typeof metadata.size === 'string' ? Number.parseInt(metadata.size, 10) : (metadata.size ?? 0);
    const currentCC = metadata.cacheControl;

    if (currentCC === TARGET_CACHE_CONTROL) {
      counters.skipped++;
      return;
    }

    if (DRY_RUN) {
      counters.updated++;
      counters.bytesAffected += size;
      console.log(
        `[dry-run] ${file.name}  ${formatBytes(size)}  cacheControl: ${currentCC ?? '(none)'} -> ${TARGET_CACHE_CONTROL}`,
      );
      return;
    }

    await file.setMetadata({ cacheControl: TARGET_CACHE_CONTROL });
    counters.updated++;
    counters.bytesAffected += size;
    if (counters.updated % 50 === 0) {
      console.log(`  ... ${counters.updated} updated so far`);
    }
  } catch (err) {
    counters.failed++;
    console.error(`FAIL ${file.name}  error=${err instanceof Error ? err.message : String(err)}`);
  }
}

async function runInBatches<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    await Promise.all(batch.map(fn));
  }
}

async function main() {
  initFirebase();

  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== BACKFILL START ===');
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Prefix: ${PREFIX}`);
  console.log(`Target Cache-Control: ${TARGET_CACHE_CONTROL}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  if (typeof LIMIT === 'number') console.log(`Limit: ${LIMIT}`);
  console.log('');

  const bucket = getStorage().bucket(BUCKET_NAME);
  const [allFiles] = await bucket.getFiles({ prefix: PREFIX });
  const files = allFiles.filter((f) => !f.name.endsWith('/'));
  const targets = typeof LIMIT === 'number' ? files.slice(0, LIMIT) : files;
  console.log(`Found ${files.length} file(s) under ${PREFIX}; processing ${targets.length}\n`);

  const counters: Counters = { updated: 0, skipped: 0, failed: 0, bytesAffected: 0 };

  await runInBatches(targets, CONCURRENCY, (file) => processFile(file, counters));

  console.log('\n=== DONE ===');
  console.log(`Updated:        ${counters.updated}`);
  console.log(`Skipped:        ${counters.skipped}  (already had ${TARGET_CACHE_CONTROL})`);
  console.log(`Failed:         ${counters.failed}`);
  console.log(`Bytes affected: ${formatBytes(counters.bytesAffected)}`);

  if (DRY_RUN) {
    console.log('\nRun without --dry-run to execute.');
  }

  process.exit(counters.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
