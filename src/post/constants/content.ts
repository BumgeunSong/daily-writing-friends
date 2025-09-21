/**
 * Shared constants for content types and editor integration
 * Used by both editor and viewer to avoid coupling
 */

// Video blot name used by Quill editor
export const EDITOR_BLOT_VIDEO = 'video-thumb' as const;
export type EditorBlotVideoName = typeof EDITOR_BLOT_VIDEO;

// Content block types for normalized content representation
export const CONTENT_BLOCK_TYPES = {
  HTML: 'html',
  VIDEO: 'video',
  IMAGE: 'image',
} as const;

export type ContentBlockType = typeof CONTENT_BLOCK_TYPES[keyof typeof CONTENT_BLOCK_TYPES];