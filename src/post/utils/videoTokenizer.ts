import { VideoEmbed, createVideoEmbed } from '../model/VideoEmbed';
import { parseYouTubeUrl, extractVideoId } from './videoUtils';

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface VideoBlock {
  type: 'video';
  data: VideoEmbed;
}

export type TokenizedBlock = TextBlock | VideoBlock;

/**
 * Securely tokenize [video](url) patterns in text content
 * Uses proper URL validation and handles edge cases gracefully
 */
export function tokenizeVideos(text: string): TokenizedBlock[] {
  if (!text || typeof text !== 'string') {
    return [{ type: 'text', content: text || '' }];
  }

  const blocks: TokenizedBlock[] = [];

  // Match [video](url) patterns - case insensitive, precise matching
  const videoPattern = /\[video\]\(([^)\s]+)\)/gi;

  let lastIndex = 0;
  let match;

  while ((match = videoPattern.exec(text)) !== null) {
    // Add text content before this video
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index);
      if (textContent) {
        blocks.push({
          type: 'text',
          content: textContent
        });
      }
    }

    // Parse and validate the URL
    const urlString = match[1];
    const videoData = parseVideoUrl(urlString);

    if (videoData) {
      // Valid YouTube URL - create video block
      blocks.push({
        type: 'video',
        data: videoData
      });
    } else {
      // Invalid URL - treat as plain text
      blocks.push({
        type: 'text',
        content: match[0] // Include the full [video](url) as text
      });
    }

    lastIndex = videoPattern.lastIndex;
  }

  // Add any remaining text after the last video
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText) {
      blocks.push({
        type: 'text',
        content: remainingText
      });
    }
  }

  // If no videos were found, return the original text as a single block
  if (blocks.length === 0) {
    return [{ type: 'text', content: text }];
  }

  return blocks;
}

/**
 * Parse and validate a video URL securely
 * Returns VideoEmbed data if valid YouTube URL, null otherwise
 */
function parseVideoUrl(urlString: string): VideoEmbed | null {
  try {
    // Validate URL format
    const url = new URL(urlString);

    // Parse YouTube URL data
    const youtubeData = parseYouTubeUrl(urlString);
    if (!youtubeData) {
      return null;
    }

    // Create VideoEmbed with basic metadata
    const videoEmbed = createVideoEmbed(
      youtubeData.videoId,
      urlString,
      {
        title: undefined, // Will be auto-generated or left empty
        thumbnail: `https://img.youtube.com/vi/${youtubeData.videoId}/hqdefault.jpg`,
      }
    );

    // Add timestamp if present
    if (youtubeData.timestamp) {
      videoEmbed.timestamp = youtubeData.timestamp;
    }

    return videoEmbed;

  } catch (error) {
    // Invalid URL format
    return null;
  }
}

/**
 * Extract plain text from tokenized blocks (for search, previews, etc.)
 */
export function blocksToText(blocks: TokenizedBlock[]): string {
  return blocks.map(block => {
    if (block.type === 'text') {
      return block.content;
    } else if (block.type === 'video') {
      return `[YouTube 동영상: ${block.data.title || block.data.videoId}]`;
    }
    return '';
  }).join('');
}

/**
 * Count videos in tokenized blocks
 */
export function countVideos(blocks: TokenizedBlock[]): number {
  return blocks.filter(block => block.type === 'video').length;
}

/**
 * Check if content contains videos
 */
export function hasVideos(blocks: TokenizedBlock[]): boolean {
  return blocks.some(block => block.type === 'video');
}