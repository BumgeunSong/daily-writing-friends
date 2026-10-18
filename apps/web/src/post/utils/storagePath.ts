import { formatDate } from '@/post/utils/dateFormat';
import { sanitizeStorageFileName } from '@/post/utils/storageFileName';

/**
 * Compose the Supabase Storage object path for an uploaded image.
 * Takes `now` as a parameter so the function is pure and date-deterministic for tests.
 *
 * Path shape: {uid}/{YYYYMMDD}/{HHMMSS}_{sanitizedFileName}
 */
const buildImageStoragePath = (uid: string, fileName: string, now: Date): string => {
  const { dateFolder, timePrefix } = formatDate(now);
  return `${uid}/${dateFolder}/${timePrefix}_${sanitizeStorageFileName(fileName)}`;
};

export { buildImageStoragePath };
