import { ReactNode } from 'react';
import DOMPurify from 'dompurify';
import { VideoEmbed, validateVideoEmbed, isVideoOp, pickVideoData } from '../model/VideoEmbed';
import { tokenizeVideos, type TokenizedBlock } from './videoTokenizer';

export interface ParsedContent {
  blocks: ContentBlock[];
  hasVideos: boolean;
  videoCount: number;
}

export type ContentBlock =
  | { type: 'html'; content: string }
  | { type: 'video'; data: VideoEmbed };

/**
 * Parse post content that may contain both HTML and video embeds
 * Handles content stored as Quill Delta operations or HTML
 */
export function parsePostContent(content: string): ParsedContent {
  if (!content) {
    return { blocks: [], hasVideos: false, videoCount: 0 };
  }

  try {
    // Try to parse as Quill Delta format first
    const deltaOps = JSON.parse(content);
    if (Array.isArray(deltaOps) || (deltaOps.ops && Array.isArray(deltaOps.ops))) {
      return parseQuillDelta(deltaOps);
    }
  } catch {
    // If not valid JSON, treat as HTML content
  }

  // Fallback to HTML parsing
  return parseHtmlContent(content);
}

/**
 * Parse Quill Delta operations into content blocks
 */
function parseQuillDelta(deltaData: any): ParsedContent {
  const ops = Array.isArray(deltaData) ? deltaData : deltaData.ops || [];
  const blocks: ContentBlock[] = [];
  let htmlBuffer = '';
  let videoCount = 0;

  const flushHtmlBuffer = () => {
    if (htmlBuffer.trim()) {
      blocks.push({
        type: 'html',
        content: DOMPurify.sanitize(htmlBuffer.trim())
      });
      htmlBuffer = '';
    }
  };

  for (const op of ops) {
    if (isVideoOp(op)) {
      // Flush any accumulated HTML before adding video
      flushHtmlBuffer();

      const videoData = pickVideoData(op);
      if (videoData) {
        blocks.push({
          type: 'video',
          data: videoData
        });
        videoCount++;
      }
    } else if (typeof op.insert === 'string') {
      // Accumulate text/HTML content
      let textContent = op.insert;

      // Apply formatting based on attributes
      if (op.attributes) {
        textContent = applyTextFormatting(textContent, op.attributes);
      }

      htmlBuffer += textContent;
    } else if (op.insert && typeof op.insert === 'object') {
      // Handle other embed types (images, etc.)
      if (op.insert.image) {
        htmlBuffer += `<img src="${DOMPurify.sanitize(op.insert.image)}" alt="Embedded image" />`;
      }
      // Could add more embed types here in the future
    }
  }

  // Flush any remaining HTML content
  flushHtmlBuffer();

  return {
    blocks,
    hasVideos: videoCount > 0,
    videoCount
  };
}

/**
 * Parse HTML content and extract video embeds from [video](url) markdown
 */
function parseHtmlContent(content: string): ParsedContent {
  // First, extract plain text from HTML for video tokenization
  const textContent = stripHtmlTags(content);

  // Tokenize videos from the text content
  const tokenizedBlocks = tokenizeVideos(textContent);

  // Convert tokenized blocks back to ContentBlocks
  const blocks: ContentBlock[] = [];
  let videoCount = 0;

  for (const block of tokenizedBlocks) {
    if (block.type === 'video') {
      blocks.push({
        type: 'video',
        data: block.data
      });
      videoCount++;
    } else if (block.type === 'text' && block.content.trim()) {
      // Re-apply HTML processing to text blocks
      const sanitizedContent = DOMPurify.sanitize(block.content);
      blocks.push({
        type: 'html',
        content: sanitizedContent
      });
    }
  }

  // If no blocks were created, fall back to original content
  if (blocks.length === 0) {
    const sanitizedContent = DOMPurify.sanitize(content);
    blocks.push({
      type: 'html',
      content: sanitizedContent
    });
  }

  return {
    blocks,
    hasVideos: videoCount > 0,
    videoCount
  };
}

/**
 * Strip HTML tags to extract plain text for video tokenization
 * This is a simple implementation - could be enhanced for better text extraction
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Convert HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Apply text formatting based on Quill attributes
 */
function applyTextFormatting(text: string, attributes: Record<string, any>): string {
  let formatted = text;

  // Handle line breaks and paragraphs
  if (text.includes('\n')) {
    formatted = text.split('\n').map(line => {
      if (!line.trim()) return '<br>';
      return `<p>${line}</p>`;
    }).join('');
  }

  // Apply inline formatting
  if (attributes.bold) {
    formatted = `<strong>${formatted}</strong>`;
  }
  if (attributes.italic) {
    formatted = `<em>${formatted}</em>`;
  }
  if (attributes.underline) {
    formatted = `<u>${formatted}</u>`;
  }
  if (attributes.strike) {
    formatted = `<s>${formatted}</s>`;
  }
  if (attributes.link) {
    const href = DOMPurify.sanitize(attributes.link);
    formatted = `<a href="${href}" target="_blank" rel="noopener noreferrer">${formatted}</a>`;
  }

  // Handle block-level formatting
  if (attributes.header) {
    const level = Math.min(Math.max(parseInt(attributes.header) || 1, 1), 6);
    formatted = `<h${level}>${formatted}</h${level}>`;
  }
  if (attributes.blockquote) {
    formatted = `<blockquote>${formatted}</blockquote>`;
  }
  if (attributes.list) {
    const listType = attributes.list === 'ordered' ? 'ol' : 'ul';
    formatted = `<${listType}><li>${formatted}</li></${listType}>`;
  }

  return formatted;
}

/**
 * Convert parsed content blocks back to HTML for fallback rendering
 */
export function contentBlocksToHtml(blocks: ContentBlock[]): string {
  return blocks.map(block => {
    if (block.type === 'html') {
      return block.content;
    } else if (block.type === 'video') {
      // Fallback HTML representation for video
      const { videoId, title, thumbnail, timestamp } = block.data;
      const timestampParam = timestamp ? `&t=${timestamp}` : '';
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}${timestampParam}`;

      return `
        <div class="video-fallback" style="margin: 1rem 0; text-align: center;">
          <a href="${watchUrl}" target="_blank" rel="noopener noreferrer">
            <img src="${thumbnail}" alt="${title || 'YouTube video'}" style="max-width: 100%; border-radius: 8px;" />
            <div style="margin-top: 0.5rem; color: #666;">
              ${title || 'YouTube 동영상 보기'}
            </div>
          </a>
        </div>
      `;
    }
    return '';
  }).join('');
}

/**
 * Extract plain text content from parsed blocks
 */
export function contentBlocksToText(blocks: ContentBlock[]): string {
  return blocks.map(block => {
    if (block.type === 'html') {
      // Convert HTML to plain text
      return block.content
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    } else if (block.type === 'video') {
      return `[동영상: ${block.data.title || 'YouTube 동영상'}]`;
    }
    return '';
  }).filter(text => text.length > 0).join('\n\n');
}