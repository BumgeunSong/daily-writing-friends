import { formatDate } from '@/post/utils/dateFormat';

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const FALLBACK_CONTENT_TYPE = 'image/jpeg';

const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
};

/**
 * Resolve the MIME type to upload with. The buckets only accept jpeg/png/webp, but the
 * client validator also lets through files whose browser-reported MIME is empty or
 * `application/octet-stream` when the extension is a supported one, so fall back to it.
 */
const resolveImageContentType = (file: { name: string; type: string }): string =>
  EXTENSION_BY_CONTENT_TYPE[file.type]
    ? file.type
    : (CONTENT_TYPE_BY_EXTENSION[extensionOf(file.name)] ?? FALLBACK_CONTENT_TYPE);

/**
 * Compose the Supabase Storage object path for an uploaded image.
 * Takes `now` and `uniqueId` as parameters so the function is pure and deterministic for tests.
 *
 * The original filename is deliberately not part of the key: Storage rejects non-ASCII
 * keys (e.g. Korean filenames), and the buckets are append-only, so two uploads in the same
 * second must never share a path.
 *
 * Path shape: {uid}/{YYYYMMDD}/{HHMMSS}_{uniqueId}.{ext}
 */
const buildImageStoragePath = (
  uid: string,
  file: { name: string; type: string },
  now: Date,
  uniqueId: string,
): string => {
  const { dateFolder, timePrefix } = formatDate(now);
  const extension = EXTENSION_BY_CONTENT_TYPE[resolveImageContentType(file)];
  return `${uid}/${dateFolder}/${timePrefix}_${uniqueId}.${extension}`;
};

export { buildImageStoragePath, resolveImageContentType };
