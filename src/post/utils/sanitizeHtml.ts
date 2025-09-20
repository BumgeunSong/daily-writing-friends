import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content for TipTap editor
 * Allows only safe tags and attributes used by our schema
 */
export function sanitize(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Configure DOMPurify to allow only specific tags and attributes
  const config: DOMPurify.Config = {
    // Allowed HTML tags
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'strong', 'em', 's', 'a', 
      'blockquote', 'ul', 'ol', 'li', 'img', 'br'
    ],
    // Allowed attributes for specific tags
    ALLOWED_ATTR: ['href', 'src', 'alt', 'target', 'rel'],
    // Force all links to open in new tab with proper security
    ADD_ATTR: ['target', 'rel'],
    // Remove all styles and data attributes
    FORBID_ATTR: ['style', 'class', 'id'],
    // Keep text content
    KEEP_CONTENT: true,
    // Allow data URIs for images (for pasted images)
    ALLOW_DATA_ATTR: false,
    // Don't allow any inline styles
    ALLOW_STYLE: false,
  };

  // Sanitize the HTML
  let sanitized = DOMPurify.sanitize(html, config);

  // Post-process to ensure all links have target="_blank" and rel="noopener noreferrer"
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitized;
  
  const links = tempDiv.querySelectorAll('a');
  links.forEach(link => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  });

  return tempDiv.innerHTML;
}

/**
 * Validate if a URL is a valid HTTP/HTTPS URL
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

// Re-export formatDate from utils for backward compatibility
export { formatDate } from './dateFormat';