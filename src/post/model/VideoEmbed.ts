import { z } from 'zod';
import { EDITOR_BLOT_VIDEO } from '../constants/content';

// Supported video platforms (extensible for future)
export const VideoPlatform = z.enum(['youtube']);
export type VideoPlatform = z.infer<typeof VideoPlatform>;

// Aspect ratio for consistent layout
export const VideoAspectRatio = z.enum(['16:9', '4:3']);
export type VideoAspectRatio = z.infer<typeof VideoAspectRatio>;

// Core video embed data structure
export const VideoEmbedSchema = z.object({
  type: VideoPlatform,
  videoId: z.string().min(1, 'Video ID is required'),
  originalUrl: z.string().url('Must be a valid URL'),
  title: z.string().optional(),
  thumbnail: z.string().url('Must be a valid thumbnail URL'),
  caption: z.string().optional(),
  timestamp: z.number().int().min(0).optional(), // Start time in seconds
  aspectRatio: VideoAspectRatio.default('16:9'),
  duration: z.number().int().min(0).optional(), // Duration in seconds
});

export type VideoEmbed = z.infer<typeof VideoEmbedSchema>;

// Quill Delta operation for video embeds
export interface VideoOp {
  insert: {
    video: VideoEmbed;
  };
  attributes?: Record<string, any>;
}

// Video metadata fetched from external APIs
export interface VideoMetadata {
  title: string;
  thumbnail: string;
  duration?: number;
  description?: string;
  channelName?: string;
}

// Video processing result
export interface VideoProcessingResult {
  success: boolean;
  data?: VideoEmbed;
  error?: string;
  metadata?: VideoMetadata;
}

// YouTube-specific data extraction
export interface YouTubeUrlData {
  videoId: string;
  timestamp?: number;
  playlistId?: string;
  isShorts?: boolean;
}

// Content block types for structured rendering
export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'video'; data: VideoEmbed }
  | { type: 'image'; src: string; alt?: string };

// Processed content for rendering
export interface ProcessedContent {
  blocks: ContentBlock[];
  metadata: {
    hasVideos: boolean;
    videoCount: number;
    hasImages: boolean;
  };
}

// Video embed validation helpers
export const validateVideoEmbed = (data: unknown): VideoEmbed | null => {
  try {
    return VideoEmbedSchema.parse(data);
  } catch {
    return null;
  }
};

export const isVideoOp = (op: any): op is { insert: Record<string, unknown> } => {
  const v = op?.insert?.video ?? op?.insert?.[EDITOR_BLOT_VIDEO];
  return validateVideoEmbed(v) !== null;
};

export const pickVideoData = (op: any): VideoEmbed | null => {
  const v = op?.insert?.video ?? op?.insert?.[EDITOR_BLOT_VIDEO];
  return validateVideoEmbed(v);
};

// Default video embed values
export const createVideoEmbed = (
  videoId: string,
  originalUrl: string,
  metadata?: Partial<VideoMetadata>
): VideoEmbed => ({
  type: 'youtube',
  videoId,
  originalUrl,
  title: metadata?.title,
  thumbnail: metadata?.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  caption: undefined,
  timestamp: undefined,
  aspectRatio: '16:9',
  duration: metadata?.duration,
});

// Video constants
export const VIDEO_CONSTANTS = {
  MAX_TITLE_LENGTH: 200,
  MAX_CAPTION_LENGTH: 500,
  DEFAULT_ASPECT_RATIO: '16:9' as VideoAspectRatio,
  THUMBNAIL_QUALITIES: ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'] as const,
  YOUTUBE_DOMAINS: [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'youtube-nocookie.com'
  ] as const,
} as const;