import { formatDate } from '@/post/utils/sanitizeHtml';
import { sanitizeStorageFileName } from '@/post/utils/storageFileName';

/**
 * Compose the Firebase Storage path for an uploaded image.
 * Takes `now` as a parameter so the function is pure and date-deterministic for tests.
 *
 * Path shape: {prefix}/{YYYYMMDD}/{HHMMSS}_{sanitizedFileName}
 */
const buildImageStoragePath = (prefix: string, fileName: string, now: Date): string => {
  const { dateFolder, timePrefix } = formatDate(now);
  return `${prefix}/${dateFolder}/${timePrefix}_${sanitizeStorageFileName(fileName)}`;
};

export { buildImageStoragePath };
