import { useState, useEffect } from 'react';
import { getResizedUrl, isFirebaseStorageUrl, THUMB_SIZES } from '@/shared/utils/thumbnailUrl';

// Resolves a Firebase Storage avatar URL to its 128x128 resized variant
// (created by the Firebase Resize Images extension). Non-Firebase URLs
// (e.g. Google OAuth, which uses the =s{size} param) pass through.
// Falls back to the original URL when the resized variant is missing.
export function useAvatarUrl(originalUrl: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(originalUrl ?? null);

  useEffect(() => {
    if (!originalUrl) {
      setUrl(null);
      return;
    }
    setUrl(originalUrl);
    if (!isFirebaseStorageUrl(originalUrl)) return;

    let cancelled = false;
    getResizedUrl(originalUrl, THUMB_SIZES.AVATAR).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [originalUrl]);

  return url;
}
