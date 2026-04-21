/**
 * Backfill script for Firebase Resize Images extension.
 *
 * The extension only processes NEW uploads. This script triggers it for
 * existing images by updating each file's metadata, which fires an
 * `object.metadataUpdate` event — the extension listens to finalize events,
 * so we use a copy-in-place approach instead: copy file to a temp path,
 * delete original, copy back to original path.
 *
 * Actually, the simplest reliable trigger is to re-upload (copy) each file.
 * We copy the file to itself using the Storage API's `copy` method, which
 * creates a new "generation" and fires an `object.finalize` event.
 *
 * Prerequisites:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
 *   - Or run `gcloud auth application-default login`
 *
 * Usage:
 *   npx tsx scripts/backfill-resize-images.ts [--dry-run]
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
const PREFIXES = ['postImages/', 'profilePhotos/'];
const RESIZE_SUFFIXES = ['_600x338', '_128x128'];
const DRY_RUN = process.argv.includes('--dry-run');

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

function isAlreadyResized(fileName: string): boolean {
  return RESIZE_SUFFIXES.some((suffix) => fileName.includes(suffix));
}

async function listOriginalFiles(prefix: string): Promise<string[]> {
  const bucket = getStorage().bucket(BUCKET_NAME);
  const [files] = await bucket.getFiles({ prefix });

  return files
    .map((f) => f.name)
    .filter((name) => {
      // Skip directories and already-resized files
      if (name.endsWith('/')) return false;
      if (isAlreadyResized(name)) return false;
      // Only process image files
      return /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(name);
    });
}

async function triggerResize(filePath: string): Promise<void> {
  const bucket = getStorage().bucket(BUCKET_NAME);
  const file = bucket.file(filePath);

  // Copy file to a temporary path, then copy back to original.
  // Each copy fires an `object.finalize` event that triggers the extension.
  const tempPath = `_backfill_tmp/${filePath}`;
  const tempFile = bucket.file(tempPath);

  await file.copy(tempFile);
  await tempFile.copy(file);
  await tempFile.delete();
}

async function main() {
  initFirebase();

  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== BACKFILL START ===');
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Prefixes: ${PREFIXES.join(', ')}\n`);

  let totalFiles = 0;
  let processed = 0;
  let errors = 0;

  for (const prefix of PREFIXES) {
    console.log(`Scanning ${prefix}...`);
    const files = await listOriginalFiles(prefix);
    console.log(`  Found ${files.length} original images\n`);
    totalFiles += files.length;

    for (const filePath of files) {
      if (DRY_RUN) {
        console.log(`  [dry-run] Would trigger: ${filePath}`);
        processed++;
        continue;
      }

      try {
        await triggerResize(filePath);
        processed++;
        if (processed % 10 === 0) {
          console.log(`  Processed ${processed}/${totalFiles}...`);
        }
      } catch (err) {
        errors++;
        console.error(`  ERROR: ${filePath}:`, err instanceof Error ? err.message : err);
      }
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Total: ${totalFiles} files`);
  console.log(`Processed: ${processed}`);
  console.log(`Errors: ${errors}`);

  if (DRY_RUN) {
    console.log('\nThis was a dry run. Run without --dry-run to execute.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
