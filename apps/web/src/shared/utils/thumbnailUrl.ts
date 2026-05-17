// URL-derivation contract:
//   This module encodes the Firebase Resize Images extension's filename convention
//   `{base}_{width}x{height}.{ext}` (e.g., `photo.jpg` → `photo_600x338.jpg`).
//
//   Avatar rendering no longer uses this helper: the upload pipeline pre-resizes
//   profile photos to 256x256 JPEG via `resizeImageBlob`, so the file at the
//   download URL is already correctly sized. Avatars render `src` directly.
//
//   This helper remains for post-image use cases (PostCardThumbnail, PostCardContent).
//   Any future server-side resize pipeline that wants to feed URLs through
//   `useThumbnailUrl` MUST emit filenames matching the `{base}_{width}x{height}.{ext}`
//   pattern, or `deriveThumbPath` will need to be refactored.

import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/firebase';

// In-memory cache: cache key (url + size) → thumbnail download URL (or null if not found)
const cache = new Map<string, string | null>();

/** Preset sizes matching Firebase Resize Images extension configuration. */
export const THUMB_SIZES = {
  /** Post card thumbnails (600×338, 16:9 aspect ratio) */
  POST: '600x338',
  /** Profile avatar images (128×128, square) */
  AVATAR: '128x128',
} as const;

type ThumbSize = (typeof THUMB_SIZES)[keyof typeof THUMB_SIZES];

/**
 * Extract the Firebase Storage path from a download URL.
 *
 * Download URLs look like:
 *   https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded_path}?alt=media&token={token}
 */
function extractStoragePath(downloadUrl: string): string | null {
  try {
    const url = new URL(downloadUrl);
    const match = url.pathname.match(/\/o\/(.+)$/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Check whether a URL points to Firebase Storage.
 */
export function isFirebaseStorageUrl(url: string): boolean {
  return url.includes('firebasestorage.googleapis.com');
}

/**
 * Derive the resized image storage path from the original path.
 *
 * Firebase Resize Images extension names resized files as:
 *   {name}_{width}x{height}.{ext}
 *
 * Example:
 *   postImages/20260421/143000_photo.jpg
 *   → postImages/20260421/143000_photo_600x338.jpg
 */
function deriveThumbPath(originalPath: string, size: ThumbSize): string | null {
  const lastDot = originalPath.lastIndexOf('.');
  if (lastDot === -1) return null;
  const base = originalPath.substring(0, lastDot);
  const ext = originalPath.substring(lastDot);
  return `${base}_${size}${ext}`;
}

/**
 * Get a resized download URL for a Firebase Storage image.
 *
 * Looks up the resized version created by the Firebase Resize Images extension.
 * Returns the original URL if no resized version exists (extension not installed,
 * or image was uploaded before the extension was enabled).
 *
 * Results are cached in memory so repeated calls for the same URL are free.
 */
export async function getResizedUrl(
  originalUrl: string,
  size: ThumbSize = THUMB_SIZES.POST,
): Promise<string> {
  const cacheKey = `${originalUrl}__${size}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? originalUrl;
  }

  const storagePath = extractStoragePath(originalUrl);
  if (!storagePath) return originalUrl;

  const thumbPath = deriveThumbPath(storagePath, size);
  if (!thumbPath) return originalUrl;

  try {
    const thumbUrl = await getDownloadURL(ref(storage, thumbPath));
    cache.set(cacheKey, thumbUrl);
    return thumbUrl;
  } catch (error: unknown) {
    // Only cache "not found" errors — transient failures should be retried
    const code = (error as { code?: string })?.code;
    if (code === 'storage/object-not-found') {
      cache.set(cacheKey, null);
    }
    return originalUrl;
  }
}

/** Convenience alias for post thumbnails. */
export const getThumbnailUrl = (originalUrl: string) =>
  getResizedUrl(originalUrl, THUMB_SIZES.POST);

/** Convenience alias for avatar images. */
export const getAvatarUrl = (originalUrl: string) =>
  getResizedUrl(originalUrl, THUMB_SIZES.AVATAR);
