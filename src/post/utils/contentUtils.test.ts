import { describe, it, expect } from 'vitest';
import {
  convertUrlsToLinks,
  getContentPreview,
  sanitizePostContent,
  sanitizeCommentContent,
  convertHtmlToText,
} from './contentUtils';

describe('contentUtils', () => {
  describe('convertUrlsToLinks', () => {
    it('should convert http URL to anchor tag', () => {
      const content = 'Check out http://example.com for more info';
      const result = convertUrlsToLinks(content);

      expect(result).toContain('<a href="http://example.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should convert https URL to anchor tag', () => {
      const content = 'Visit https://secure.example.com';
      const result = convertUrlsToLinks(content);

      expect(result).toContain('<a href="https://secure.example.com"');
    });

    it('should add http prefix to URLs without protocol', () => {
      const content = 'Go to www.example.com';
      const result = convertUrlsToLinks(content);

      expect(result).toContain('<a href="http://www.example.com"');
      expect(result).toContain('>www.example.com</a>');
    });

    it('should handle multiple URLs in content', () => {
      const content = 'Check http://one.com and http://two.com';
      const result = convertUrlsToLinks(content);

      expect(result).toContain('href="http://one.com"');
      expect(result).toContain('href="http://two.com"');
    });

    it('should preserve non-URL text', () => {
      const content = 'Hello world without any URLs';
      const result = convertUrlsToLinks(content);

      expect(result).toBe(content);
    });

    it('should handle URLs with paths and query strings', () => {
      const content = 'Visit https://example.com/path?query=value&other=123';
      const result = convertUrlsToLinks(content);

      expect(result).toContain('href="https://example.com/path?query=value&other=123"');
    });

    it('should handle URLs with fragments', () => {
      const content = 'See https://example.com/page#section';
      const result = convertUrlsToLinks(content);

      expect(result).toContain('https://example.com/page#section');
    });
  });

  describe('getContentPreview', () => {
    it('should sanitize and process HTML content', () => {
      const content = '<p>Hello World</p>';
      const result = getContentPreview(content);

      expect(result).toContain('Hello World');
    });

    it('should remove image tags', () => {
      const content = '<p>Text <img src="image.jpg" alt="test" /> more text</p>';
      const result = getContentPreview(content);

      expect(result).not.toContain('<img');
      expect(result).not.toContain('image.jpg');
    });

    it('should convert heading tags to paragraphs', () => {
      const content = '<h1>Heading</h1><p>Paragraph</p>';
      const result = getContentPreview(content);

      expect(result).not.toContain('<h1>');
      expect(result).toContain('Heading');
    });

    it('should convert list items to paragraphs with dash prefix', () => {
      const content = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = getContentPreview(content);

      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('should remove empty tags', () => {
      const content = '<p>Text</p><p></p><p>More</p>';
      const result = getContentPreview(content);

      // Empty paragraphs should be removed
      expect(result).toContain('Text');
      expect(result).toContain('More');
    });

    it('should handle nested HTML elements', () => {
      const content = '<div><p><strong>Bold</strong> and <em>italic</em></p></div>';
      const result = getContentPreview(content);

      expect(result).toContain('Bold');
      expect(result).toContain('italic');
    });
  });

  describe('sanitizePostContent', () => {
    it('should sanitize basic HTML content', () => {
      const content = '<p>Hello <strong>World</strong></p>';
      const result = sanitizePostContent(content);

      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should convert Quill bullet lists from ol to ul', () => {
      const content = '<ol><li data-list="bullet">Item 1</li><li data-list="bullet">Item 2</li></ol>';
      const result = sanitizePostContent(content);

      expect(result).toContain('<ul');
      expect(result).not.toMatch(/<ol[^>]*><li data-list="bullet"/);
    });

    it('should preserve ordered lists without bullet data attribute', () => {
      const content = '<ol><li>Item 1</li><li>Item 2</li></ol>';
      const result = sanitizePostContent(content);

      expect(result).toContain('<ol');
    });

    it('should handle mixed list types', () => {
      const content =
        '<ol><li data-list="bullet">Bullet</li></ol><ol><li>Numbered</li></ol>';
      const result = sanitizePostContent(content);

      expect(result).toContain('<ul');
      expect(result).toContain('<ol');
    });

    it('should remove malicious script tags', () => {
      const content = '<p>Safe</p><script>alert("XSS")</script>';
      const result = sanitizePostContent(content);

      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Safe');
    });
  });

  describe('sanitizeCommentContent', () => {
    it('should convert URLs to clickable links', () => {
      const content = 'Check out https://example.com';
      const result = sanitizeCommentContent(content);

      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should convert > lines to blockquotes', () => {
      const content = '> This is a quote\nThis is not';
      const result = sanitizeCommentContent(content);

      expect(result).toContain('<blockquote>');
      expect(result).toContain('This is a quote');
    });

    it('should handle multiple consecutive quote lines', () => {
      const content = '> Line 1\n> Line 2\n> Line 3';
      const result = sanitizeCommentContent(content);

      expect(result).toContain('<blockquote>');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
    });

    it('should handle quote followed by text', () => {
      const content = '> Quote\nReply text';
      const result = sanitizeCommentContent(content);

      expect(result).toContain('<blockquote>');
      expect(result).toContain('Quote');
      expect(result).toContain('Reply text');
    });

    it('should sanitize dangerous HTML in comments', () => {
      const content = '<script>alert("XSS")</script>Normal text';
      const result = sanitizeCommentContent(content);

      expect(result).not.toContain('<script');
      expect(result).toContain('Normal text');
    });

    it('should convert Quill bullet lists in comments', () => {
      const content = '<ol><li data-list="bullet">Comment bullet</li></ol>';
      const result = sanitizeCommentContent(content);

      expect(result).toContain('<ul');
    });
  });

  describe('convertHtmlToText', () => {
    it('should remove all HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const result = convertHtmlToText(html);

      expect(result).toBe('Hello World');
    });

    it('should convert <br> tags to newlines', () => {
      const html = 'Line 1<br>Line 2<br/>Line 3';
      const result = convertHtmlToText(html);

      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should convert paragraph breaks to newlines', () => {
      const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
      const result = convertHtmlToText(html);

      expect(result).toContain('Paragraph 1');
      expect(result).toContain('\n');
      expect(result).toContain('Paragraph 2');
    });

    it('should decode HTML entities', () => {
      const html = '&lt;div&gt; &amp; &quot;quotes&quot; &#39;apostrophe&#39;';
      const result = convertHtmlToText(html);

      expect(result).toBe('<div> & "quotes" \'apostrophe\'');
    });

    it('should convert &nbsp; to space', () => {
      const html = 'Hello&nbsp;World';
      const result = convertHtmlToText(html);

      expect(result).toBe('Hello World');
    });

    it('should collapse multiple spaces to single space', () => {
      const html = 'Hello     World';
      const result = convertHtmlToText(html);

      expect(result).toBe('Hello World');
    });

    it('should limit consecutive newlines to two', () => {
      const html = '<p>One</p><p></p><p></p><p></p><p>Two</p>';
      const result = convertHtmlToText(html);

      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n\s*\n\s*\n/);
    });

    it('should trim leading and trailing whitespace', () => {
      const html = '   <p>Content</p>   ';
      const result = convertHtmlToText(html);

      expect(result).toBe('Content');
    });

    it('should return empty string for null input', () => {
      const result = convertHtmlToText(null as unknown as string);
      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = convertHtmlToText(undefined as unknown as string);
      expect(result).toBe('');
    });

    it('should return empty string for empty input', () => {
      const result = convertHtmlToText('');
      expect(result).toBe('');
    });

    it('should handle nested tags correctly', () => {
      const html = '<div><span><strong>Nested</strong></span></div>';
      const result = convertHtmlToText(html);

      expect(result).toBe('Nested');
    });

    it('should handle complex HTML structure', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Paragraph with <strong>bold</strong> and <em>italic</em></p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;
      const result = convertHtmlToText(html);

      expect(result).toContain('Title');
      expect(result).toContain('Paragraph');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });
  });
});
