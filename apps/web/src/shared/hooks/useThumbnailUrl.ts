import { useState, useEffect } from 'react';
import { getResizedUrl, THUMB_SIZES } from '@/shared/utils/thumbnailUrl';

type ThumbSize = (typeof THUMB_SIZES)[keyof typeof THUMB_SIZES];

/**
 * React hook that resolves a Firebase Storage image URL to its resized version.
 *
 * Uses the Firebase Resize Images extension naming convention to find resized copies.
 * Falls back to the original URL if no resized version exists (cached, so no repeated lookups).
 *
 * Returns the original URL immediately to avoid blank flashes, then swaps to the
 * resized version once resolved.
 */
export function useThumbnailUrl(
  originalUrl: string | null,
  size: ThumbSize = THUMB_SIZES.POST,
): string | null {
  const [url, setUrl] = useState(originalUrl);

  useEffect(() => {
    if (!originalUrl) {
      setUrl(null);
      return;
    }

    // Show original immediately
    setUrl(originalUrl);

    let cancelled = false;
    getResizedUrl(originalUrl, size).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [originalUrl, size]);

  return url;
}
