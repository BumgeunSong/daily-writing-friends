const MAX_PREVIEW_LENGTH = 200;
const MAX_PREVIEW_LINES = 3;

/**
 * Strip HTML tags and decode common entities from content.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Extract a short preview from post content.
 * Strips HTML, takes the first 3 non-empty lines, truncated to ~200 chars.
 */
export function extractPreview(content: string): string {
  const plain = stripHtml(content);

  const lines = plain
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, MAX_PREVIEW_LINES);

  const joined = lines.join('\n');

  if (joined.length <= MAX_PREVIEW_LENGTH) {
    return joined;
  }

  return joined.slice(0, MAX_PREVIEW_LENGTH) + '...';
}
