import { YouTubeUrlData, VIDEO_CONSTANTS } from '../model/VideoEmbed';

/**
 * Robust YouTube URL parsing with comprehensive edge case handling
 * Supports: watch URLs, short URLs, embed URLs, shorts, playlists, timestamps
 */
export const parseYouTubeUrl = (input: string): YouTubeUrlData | null => {
  if (!input || typeof input !== 'string') {
    return null;
  }

  try {
    // Clean and normalize input
    const cleanInput = input.trim();

    // Handle URLs without protocol
    const urlString = cleanInput.startsWith('http')
      ? cleanInput
      : `https://${cleanInput}`;

    const url = new URL(urlString);

    // Validate YouTube domain
    if (!VIDEO_CONSTANTS.YOUTUBE_DOMAINS.includes(url.hostname as any)) {
      return null;
    }

    // Parse based on URL pattern
    if (url.hostname === 'youtu.be') {
      return parseShortUrl(url);
    }

    if (url.pathname === '/watch') {
      return parseWatchUrl(url);
    }

    if (url.pathname.startsWith('/embed/')) {
      return parseEmbedUrl(url);
    }

    if (url.pathname.startsWith('/shorts/')) {
      return parseShortsUrl(url);
    }

    // Handle channel URLs with video parameter
    if (url.pathname.startsWith('/channel/') || url.pathname.startsWith('/c/') || url.pathname.startsWith('/@')) {
      return parseChannelVideoUrl(url);
    }

    return null;
  } catch (error) {
    // Invalid URL or parsing error
    return null;
  }
};

/**
 * Parse YouTube short URLs (youtu.be/VIDEO_ID)
 */
const parseShortUrl = (url: URL): YouTubeUrlData | null => {
  const videoId = url.pathname.slice(1); // Remove leading slash

  if (!isValidVideoId(videoId)) {
    return null;
  }

  return {
    videoId,
    timestamp: extractTimestamp(url),
  };
};

/**
 * Parse standard watch URLs (youtube.com/watch?v=VIDEO_ID)
 */
const parseWatchUrl = (url: URL): YouTubeUrlData | null => {
  const videoId = url.searchParams.get('v');

  if (!videoId || !isValidVideoId(videoId)) {
    return null;
  }

  return {
    videoId,
    timestamp: extractTimestamp(url),
    playlistId: url.searchParams.get('list') || undefined,
  };
};

/**
 * Parse embed URLs (youtube.com/embed/VIDEO_ID)
 */
const parseEmbedUrl = (url: URL): YouTubeUrlData | null => {
  const pathParts = url.pathname.split('/');
  const videoId = pathParts[2]; // /embed/VIDEO_ID

  if (!videoId || !isValidVideoId(videoId)) {
    return null;
  }

  return {
    videoId,
    timestamp: extractTimestamp(url) || extractStartParam(url),
  };
};

/**
 * Parse YouTube Shorts URLs (youtube.com/shorts/VIDEO_ID)
 */
const parseShortsUrl = (url: URL): YouTubeUrlData | null => {
  const pathParts = url.pathname.split('/');
  const videoId = pathParts[2]; // /shorts/VIDEO_ID

  if (!videoId || !isValidVideoId(videoId)) {
    return null;
  }

  return {
    videoId,
    timestamp: extractTimestamp(url),
    isShorts: true,
  };
};

/**
 * Parse channel URLs with video parameter
 */
const parseChannelVideoUrl = (url: URL): YouTubeUrlData | null => {
  const videoId = url.searchParams.get('v');

  if (!videoId || !isValidVideoId(videoId)) {
    return null;
  }

  return {
    videoId,
    timestamp: extractTimestamp(url),
  };
};

/**
 * Extract timestamp from URL parameters
 * Supports: t=1h2m3s, t=123s, t=123, start=123
 */
const extractTimestamp = (url: URL): number | undefined => {
  const t = url.searchParams.get('t');
  const start = url.searchParams.get('start');
  const timeParam = t || start;

  if (!timeParam) {
    return undefined;
  }

  return parseTimestring(timeParam);
};

/**
 * Extract start parameter from embed URLs
 */
const extractStartParam = (url: URL): number | undefined => {
  const start = url.searchParams.get('start');
  return start ? parseInt(start, 10) : undefined;
};

/**
 * Parse timestring to seconds
 * Supports formats: 1h2m3s, 2m30s, 90s, 90
 */
export const parseTimestring = (timestring: string): number => {
  const str = timestring.toLowerCase().trim();

  // Handle plain numbers (seconds)
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10);
  }

  // Handle formats with units (1h2m3s, 2m30s, etc.)
  const matches = str.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?/);

  if (!matches) {
    return 0;
  }

  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Format seconds to human-readable timestring
 */
export const formatTimestring = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h${minutes}m${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Validate YouTube video ID format
 * YouTube video IDs are typically 11 characters, alphanumeric + hyphens/underscores
 */
const isValidVideoId = (videoId: string): boolean => {
  if (!videoId || typeof videoId !== 'string') {
    return false;
  }

  // YouTube video IDs are typically 11 characters
  // Can contain letters, numbers, hyphens, and underscores
  const videoIdPattern = /^[a-zA-Z0-9_-]{10,12}$/;
  return videoIdPattern.test(videoId);
};

/**
 * Check if a string looks like a YouTube URL
 */
export const isYouTubeUrl = (input: string): boolean => {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const cleanInput = input.trim().toLowerCase();

  // Check for YouTube domains
  return VIDEO_CONSTANTS.YOUTUBE_DOMAINS.some(domain =>
    cleanInput.includes(domain)
  );
};

/**
 * Generate YouTube embed URL with optional timestamp
 */
export const generateEmbedUrl = (videoId: string, timestamp?: number, options?: {
  autoplay?: boolean;
  controls?: boolean;
  showinfo?: boolean;
  rel?: boolean;
}): string => {
  const params = new URLSearchParams();

  // Default embed parameters
  params.set('showinfo', '0');
  params.set('rel', '0');

  // Optional parameters
  if (timestamp) {
    params.set('start', timestamp.toString());
  }

  if (options?.autoplay) {
    params.set('autoplay', '1');
  }

  if (options?.controls === false) {
    params.set('controls', '0');
  }

  const queryString = params.toString();
  return `https://www.youtube.com/embed/${videoId}${queryString ? '?' + queryString : ''}`;
};

/**
 * Generate YouTube watch URL
 */
export const generateWatchUrl = (videoId: string, timestamp?: number): string => {
  const params = new URLSearchParams({ v: videoId });

  if (timestamp) {
    params.set('t', timestamp.toString());
  }

  return `https://www.youtube.com/watch?${params.toString()}`;
};

/**
 * Extract video ID from any YouTube URL format
 */
export const extractVideoId = (url: string): string | null => {
  const parsed = parseYouTubeUrl(url);
  return parsed?.videoId || null;
};

/**
 * Validate and normalize YouTube URL
 */
export const normalizeYouTubeUrl = (url: string): string | null => {
  const parsed = parseYouTubeUrl(url);
  if (!parsed) {
    return null;
  }

  return generateWatchUrl(parsed.videoId, parsed.timestamp);
};