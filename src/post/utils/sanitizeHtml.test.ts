import { describe, it, expect } from 'vitest';
import { sanitize, isValidHttpUrl, formatDate } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  describe('sanitize', () => {
    it('should return empty string for null input', () => {
      expect(sanitize(null as unknown as string)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(sanitize(undefined as unknown as string)).toBe('');
    });

    it('should return empty string for empty string input', () => {
      expect(sanitize('')).toBe('');
    });

    it('should allow paragraph tags', () => {
      const html = '<p>Hello World</p>';
      const result = sanitize(html);
      expect(result).toContain('<p>');
      expect(result).toContain('Hello World');
    });

    it('should allow heading tags', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2>';
      const result = sanitize(html);
      expect(result).toContain('<h1>');
      expect(result).toContain('<h2>');
    });

    it('should allow formatting tags', () => {
      const html = '<strong>Bold</strong> <em>Italic</em> <s>Strikethrough</s>';
      const result = sanitize(html);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('<s>');
    });

    it('should allow link tags with href', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = sanitize(html);
      expect(result).toContain('<a');
      expect(result).toContain('href="https://example.com"');
    });

    it('should add target="_blank" and rel="noopener noreferrer" to links', () => {
      const html = '<a href="https://example.com">Link</a>';
      const result = sanitize(html);
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should allow blockquote tags', () => {
      const html = '<blockquote>Quote</blockquote>';
      const result = sanitize(html);
      expect(result).toContain('<blockquote>');
    });

    it('should allow list tags', () => {
      const html = '<ul><li>Item 1</li></ul><ol><li>Item 2</li></ol>';
      const result = sanitize(html);
      expect(result).toContain('<ul>');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>');
    });

    it('should allow image tags with src and alt', () => {
      const html = '<img src="image.jpg" alt="Description" />';
      const result = sanitize(html);
      expect(result).toContain('<img');
      expect(result).toContain('src="image.jpg"');
      expect(result).toContain('alt="Description"');
    });

    it('should allow br tags', () => {
      const html = 'Line 1<br>Line 2';
      const result = sanitize(html);
      expect(result).toContain('<br');
    });

    it('should remove script tags', () => {
      const html = '<p>Safe</p><script>alert("XSS")</script>';
      const result = sanitize(html);
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
    });

    it('should remove style attributes', () => {
      const html = '<p style="color: red;">Styled</p>';
      const result = sanitize(html);
      expect(result).not.toContain('style=');
    });

    it('should remove class attributes', () => {
      const html = '<p class="my-class">Classed</p>';
      const result = sanitize(html);
      expect(result).not.toContain('class=');
    });

    it('should remove id attributes', () => {
      const html = '<p id="my-id">Identified</p>';
      const result = sanitize(html);
      expect(result).not.toContain('id=');
    });

    it('should remove onclick and other event handlers', () => {
      const html = '<p onclick="alert(1)">Clickable</p>';
      const result = sanitize(html);
      expect(result).not.toContain('onclick');
    });

    it('should remove disallowed tags but keep content', () => {
      const html = '<div><span>Content</span></div>';
      const result = sanitize(html);
      expect(result).toContain('Content');
    });

    it('should handle nested allowed tags', () => {
      const html = '<p><strong><em>Nested</em></strong></p>';
      const result = sanitize(html);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
      expect(result).toContain('Nested');
    });

    it('should handle complex HTML structure', () => {
      const html = `
        <h1>Title</h1>
        <p>Paragraph with <strong>bold</strong> and <a href="https://example.com">link</a></p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      `;
      const result = sanitize(html);
      expect(result).toContain('<h1>');
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<a');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });
  });

  describe('isValidHttpUrl', () => {
    it('should return true for valid http URL', () => {
      expect(isValidHttpUrl('http://example.com')).toBe(true);
    });

    it('should return true for valid https URL', () => {
      expect(isValidHttpUrl('https://example.com')).toBe(true);
    });

    it('should return true for URL with path', () => {
      expect(isValidHttpUrl('https://example.com/path/to/page')).toBe(true);
    });

    it('should return true for URL with query string', () => {
      expect(isValidHttpUrl('https://example.com?query=value')).toBe(true);
    });

    it('should return true for URL with port', () => {
      expect(isValidHttpUrl('http://example.com:8080')).toBe(true);
    });

    it('should return true for URL with fragment', () => {
      expect(isValidHttpUrl('https://example.com#section')).toBe(true);
    });

    it('should return false for ftp URL', () => {
      expect(isValidHttpUrl('ftp://example.com')).toBe(false);
    });

    it('should return false for file URL', () => {
      expect(isValidHttpUrl('file:///path/to/file')).toBe(false);
    });

    it('should return false for javascript URL', () => {
      expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    });

    it('should return false for data URL', () => {
      expect(isValidHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should return false for invalid URL', () => {
      expect(isValidHttpUrl('not-a-url')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidHttpUrl('')).toBe(false);
    });

    it('should return false for URL without protocol', () => {
      expect(isValidHttpUrl('example.com')).toBe(false);
    });

    it('should return false for mailto URL', () => {
      expect(isValidHttpUrl('mailto:test@example.com')).toBe(false);
    });

    it('should return false for tel URL', () => {
      expect(isValidHttpUrl('tel:+1234567890')).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should return dateFolder in YYYYMMDD format', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const result = formatDate(date);

      expect(result.dateFolder).toBe('20250115');
    });

    it('should return timePrefix in HHMMSS format', () => {
      const date = new Date(2025, 0, 15, 14, 30, 45);
      const result = formatDate(date);

      expect(result.timePrefix).toBe('143045');
    });

    it('should pad single digit months with zero', () => {
      const date = new Date(2025, 4, 8); // May 8
      const result = formatDate(date);

      expect(result.dateFolder).toBe('20250508');
    });

    it('should pad single digit days with zero', () => {
      const date = new Date(2025, 11, 5); // December 5
      const result = formatDate(date);

      expect(result.dateFolder).toBe('20251205');
    });

    it('should pad single digit hours with zero', () => {
      const date = new Date(2025, 0, 15, 9, 30, 45);
      const result = formatDate(date);

      expect(result.timePrefix).toBe('093045');
    });

    it('should pad single digit minutes with zero', () => {
      const date = new Date(2025, 0, 15, 14, 5, 45);
      const result = formatDate(date);

      expect(result.timePrefix).toBe('140545');
    });

    it('should pad single digit seconds with zero', () => {
      const date = new Date(2025, 0, 15, 14, 30, 5);
      const result = formatDate(date);

      expect(result.timePrefix).toBe('143005');
    });

    it('should handle midnight correctly', () => {
      const date = new Date(2025, 0, 15, 0, 0, 0);
      const result = formatDate(date);

      expect(result.timePrefix).toBe('000000');
    });

    it('should handle end of day correctly', () => {
      const date = new Date(2025, 0, 15, 23, 59, 59);
      const result = formatDate(date);

      expect(result.timePrefix).toBe('235959');
    });

    it('should return object with both properties', () => {
      const date = new Date(2025, 0, 15, 14, 30, 45);
      const result = formatDate(date);

      expect(result).toHaveProperty('dateFolder');
      expect(result).toHaveProperty('timePrefix');
    });
  });
});
