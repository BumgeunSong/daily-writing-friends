import { VIDEO_CONSTANTS } from '../model/VideoEmbed';

export interface ThumbnailResult {
  url: string;
  quality: string;
  width: number;
  height: number;
}

/**
 * YouTube thumbnail quality configurations
 * Ordered from highest to lowest quality with fallback cascade
 */
const THUMBNAIL_CONFIGS = {
  maxresdefault: { width: 1280, height: 720, quality: 'maxres' },
  sddefault: { width: 640, height: 480, quality: 'standard' },
  hqdefault: { width: 480, height: 360, quality: 'high' },
  mqdefault: { width: 320, height: 180, quality: 'medium' },
  default: { width: 120, height: 90, quality: 'default' },
} as const;

/**
 * Get reliable YouTube thumbnail with fallback cascade
 * Falls back through quality levels until finding an available thumbnail
 */
export const getReliableThumbnail = async (videoId: string): Promise<ThumbnailResult> => {
  // Try each quality level in order
  for (const quality of VIDEO_CONSTANTS.THUMBNAIL_QUALITIES) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;

    if (await checkImageExists(url)) {
      const config = THUMBNAIL_CONFIGS[quality];
      return {
        url,
        quality: config.quality,
        width: config.width,
        height: config.height,
      };
    }
  }

  // Final fallback - default thumbnail always exists
  const defaultUrl = `https://img.youtube.com/vi/${videoId}/default.jpg`;
  const defaultConfig = THUMBNAIL_CONFIGS.default;

  return {
    url: defaultUrl,
    quality: defaultConfig.quality,
    width: defaultConfig.width,
    height: defaultConfig.height,
  };
};

/**
 * Get thumbnail URL for specific quality (without availability check)
 * Use this when you want a specific quality and can handle 404s
 */
export const getThumbnailUrl = (videoId: string, quality: keyof typeof THUMBNAIL_CONFIGS = 'hqdefault'): string => {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
};

/**
 * Check if image exists by attempting to load it
 * Uses Promise-based approach for better performance
 */
const checkImageExists = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Use fetch with HEAD request for efficiency (no image data transfer)
    fetch(url, { method: 'HEAD' })
      .then(response => {
        resolve(response.ok && response.status === 200);
      })
      .catch(() => {
        resolve(false);
      });
  });
};

/**
 * Alternative image existence check using Image object
 * Fallback method if fetch fails or is blocked
 */
const checkImageExistsWithImage = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);

    // Set timeout to avoid hanging
    const timeout = setTimeout(() => {
      resolve(false);
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };

    img.src = url;
  });
};

/**
 * Get multiple thumbnail sizes for responsive images
 * Returns available thumbnails for srcset usage
 */
export const getResponsiveThumbnails = async (videoId: string): Promise<ThumbnailResult[]> => {
  const results: ThumbnailResult[] = [];

  // Check each quality level
  for (const quality of VIDEO_CONSTANTS.THUMBNAIL_QUALITIES) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;

    if (await checkImageExists(url)) {
      const config = THUMBNAIL_CONFIGS[quality];
      results.push({
        url,
        quality: config.quality,
        width: config.width,
        height: config.height,
      });
    }
  }

  // Ensure we always have at least the default thumbnail
  if (results.length === 0) {
    const defaultUrl = `https://img.youtube.com/vi/${videoId}/default.jpg`;
    const defaultConfig = THUMBNAIL_CONFIGS.default;

    results.push({
      url: defaultUrl,
      quality: defaultConfig.quality,
      width: defaultConfig.width,
      height: defaultConfig.height,
    });
  }

  return results;
};

/**
 * Generate srcset string for responsive images
 */
export const generateThumbnailSrcSet = (thumbnails: ThumbnailResult[]): string => {
  return thumbnails
    .map(thumb => `${thumb.url} ${thumb.width}w`)
    .join(', ');
};

/**
 * Generate sizes attribute for responsive images
 */
export const generateThumbnailSizes = (maxWidth: number = 1280): string => {
  return `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${maxWidth}px`;
};

/**
 * Preload thumbnail image for better UX
 * Useful for dialog previews or hover effects
 */
export const preloadThumbnail = (videoId: string): Promise<string> => {
  return getReliableThumbnail(videoId).then(result => {
    // Create image element to trigger browser preload
    const img = new Image();
    img.src = result.url;
    return result.url;
  });
};

/**
 * Get thumbnail with retry mechanism
 * Useful for handling temporary network issues
 */
export const getThumbnailWithRetry = async (
  videoId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<ThumbnailResult> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await getReliableThumbnail(videoId);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt < maxRetries - 1) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  // If all retries failed, return default thumbnail
  const defaultUrl = `https://img.youtube.com/vi/${videoId}/default.jpg`;
  const defaultConfig = THUMBNAIL_CONFIGS.default;

  return {
    url: defaultUrl,
    quality: defaultConfig.quality,
    width: defaultConfig.width,
    height: defaultConfig.height,
  };
};

/**
 * Extract video thumbnail from YouTube API response
 * Useful if you're also fetching metadata from YouTube API
 */
export const extractThumbnailFromApiResponse = (apiResponse: any): ThumbnailResult | null => {
  try {
    const thumbnails = apiResponse?.snippet?.thumbnails;

    if (!thumbnails) {
      return null;
    }

    // Prefer highest quality available
    for (const quality of ['maxres', 'standard', 'high', 'medium', 'default']) {
      const thumbnail = thumbnails[quality];
      if (thumbnail?.url) {
        return {
          url: thumbnail.url,
          quality,
          width: thumbnail.width || 0,
          height: thumbnail.height || 0,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Cache manager for thumbnails (in-memory)
 * Reduces redundant requests for the same video
 */
class ThumbnailCache {
  private cache = new Map<string, ThumbnailResult>();
  private maxSize = 100; // Limit cache size

  get(videoId: string): ThumbnailResult | null {
    return this.cache.get(videoId) || null;
  }

  set(videoId: string, thumbnail: ThumbnailResult): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(videoId, thumbnail);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Export singleton cache instance
export const thumbnailCache = new ThumbnailCache();

/**
 * Get cached thumbnail or fetch new one
 */
export const getCachedThumbnail = async (videoId: string): Promise<ThumbnailResult> => {
  const cached = thumbnailCache.get(videoId);

  if (cached) {
    return cached;
  }

  const thumbnail = await getReliableThumbnail(videoId);
  thumbnailCache.set(videoId, thumbnail);

  return thumbnail;
};