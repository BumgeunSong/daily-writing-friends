import { describe, it, expect } from 'vitest';
import {
  renderPostPreviewHtml,
  renderPostBodyHtml,
  renderCommentBodyHtml,
  extractPlainText,
} from './contentUtils';

describe('contentUtils', () => {
  describe('renderPostPreviewHtml', () => {
    it('should sanitize and process HTML content', () => {
      const content = '<p>Hello World</p>';
      const result = renderPostPreviewHtml(content);

      expect(result).toContain('Hello World');
    });

    it('should remove image tags', () => {
      const content = '<p>Text <img src="image.jpg" alt="test" /> more text</p>';
      const result = renderPostPreviewHtml(content);

      expect(result).not.toContain('<img');
      expect(result).not.toContain('image.jpg');
    });

    it('should convert heading tags to paragraphs', () => {
      const content = '<h1>Heading</h1><p>Paragraph</p>';
      const result = renderPostPreviewHtml(content);

      expect(result).not.toContain('<h1>');
      expect(result).toContain('Heading');
    });

    it('should convert list items to paragraphs with dash prefix', () => {
      const content = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = renderPostPreviewHtml(content);

      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('should remove empty tags', () => {
      const content = '<p>Text</p><p></p><p>More</p>';
      const result = renderPostPreviewHtml(content);

      // Empty paragraphs should be removed
      expect(result).toContain('Text');
      expect(result).toContain('More');
    });

    it('should handle nested HTML elements', () => {
      const content = '<div><p><strong>Bold</strong> and <em>italic</em></p></div>';
      const result = renderPostPreviewHtml(content);

      expect(result).toContain('Bold');
      expect(result).toContain('italic');
    });
  });

  describe('renderPostBodyHtml', () => {
    it('should sanitize basic HTML content', () => {
      const content = '<p>Hello <strong>World</strong></p>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should convert Quill bullet lists from ol to ul', () => {
      const content = '<ol><li data-list="bullet">Item 1</li><li data-list="bullet">Item 2</li></ol>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<ul');
      expect(result).not.toMatch(/<ol[^>]*><li data-list="bullet"/);
    });

    it('should preserve ordered lists without bullet data attribute', () => {
      const content = '<ol><li>Item 1</li><li>Item 2</li></ol>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<ol');
    });

    it('should handle mixed list types in separate ol elements', () => {
      const content =
        '<ol><li data-list="bullet">Bullet</li></ol><ol><li>Numbered</li></ol>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<ul');
      expect(result).toContain('<ol');
    });

    it('should split mixed bullet and ordered items within a single ol', () => {
      const content =
        '<ol><li data-list="bullet">Bullet 1</li><li>Ordered 1</li><li data-list="bullet">Bullet 2</li></ol>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<ul');
      expect(result).toContain('<ol');
      expect(result).toContain('Bullet 1');
      expect(result).toContain('Ordered 1');
      expect(result).toContain('Bullet 2');
    });

    it('should remove malicious script tags', () => {
      const content = '<p>Safe</p><script>alert("XSS")</script>';
      const result = renderPostBodyHtml(content);

      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('Safe');
    });

    it('should convert newlines to <br> tags for plain text content', () => {
      const content = '첫 번째 줄\n두 번째 줄';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<br>');
      expect(result).toContain('첫 번째 줄');
      expect(result).toContain('두 번째 줄');
    });

    it('should convert multiple newlines to multiple <br> tags for plain text', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('Line 1<br>Line 2<br>Line 3');
    });

    it('should NOT convert newlines for HTML content (already has HTML tags)', () => {
      const content = '<p>Line 1</p>\n<p>Line 2</p>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<p>Line 1</p>');
      expect(result).toContain('<p>Line 2</p>');
      expect(result).not.toContain('<br>');
    });

    it('should handle plain text with consecutive newlines', () => {
      const content = 'Line 1\n\nLine 2';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<br>');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });

    it('should preserve empty paragraphs as visible line breaks', () => {
      const content = '<p>하이아이</p><p></p><p>호이오이</p>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<p><br></p>');
      expect(result).toContain('하이아이');
      expect(result).toContain('호이오이');
    });

    it('should preserve multiple consecutive empty paragraphs each as a separate line break', () => {
      const content = '<p>Before</p><p></p><p></p><p>After</p>';
      const result = renderPostBodyHtml(content);

      const matches = result.match(/<p><br><\/p>/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(2);
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });

    it('should preserve an empty paragraph at the start of content', () => {
      const content = '<p></p><p>텍스트</p>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<p><br></p>');
      expect(result).toContain('텍스트');
    });

    it('should preserve an empty paragraph at the end of content', () => {
      const content = '<p>텍스트</p><p></p>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<p><br></p>');
      expect(result).toContain('텍스트');
    });

    it('should split a mixed list where ordered items come before a bullet item', () => {
      const content =
        '<ol><li>Ordered 1</li><li>Ordered 2</li><li data-list="bullet">Bullet</li></ol>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('<ol');
      expect(result).toContain('<ul');
      expect(result).toContain('Ordered 1');
      expect(result).toContain('Ordered 2');
      expect(result).toContain('Bullet');
    });

    it('should preserve data-list attribute on li elements after splitting a mixed list', () => {
      const content =
        '<ol><li data-list="bullet">Bullet</li><li>Ordered</li></ol>';
      const result = renderPostBodyHtml(content);

      expect(result).toContain('data-list="bullet"');
    });

    it('should preserve ordered list numbering continuity when splitting mixed lists', () => {
      const content =
        '<ol><li>First</li><li>Second</li><li data-list="bullet">Bullet</li><li>Third</li></ol>';
      const result = renderPostBodyHtml(content);

      // 두 번째 ol은 start="3"이어야 번호가 연속됨
      expect(result).toMatch(/<ol[^>]*start="3"[^>]*>/);
      expect(result).toContain('First');
      expect(result).toContain('Third');
    });
  });

  describe('renderCommentBodyHtml', () => {
    it('should convert URLs to clickable links', () => {
      const content = 'Check out https://example.com';
      const result = renderCommentBodyHtml(content);

      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('should convert > lines to blockquotes', () => {
      const content = '> This is a quote\nThis is not';
      const result = renderCommentBodyHtml(content);

      expect(result).toContain('<blockquote>');
      expect(result).toContain('This is a quote');
    });

    it('should handle multiple consecutive quote lines', () => {
      const content = '> Line 1\n> Line 2\n> Line 3';
      const result = renderCommentBodyHtml(content);

      expect(result).toContain('<blockquote>');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
      expect(result).toContain('Line 3');
    });

    it('should handle quote followed by text', () => {
      const content = '> Quote\nReply text';
      const result = renderCommentBodyHtml(content);

      expect(result).toContain('<blockquote>');
      expect(result).toContain('Quote');
      expect(result).toContain('Reply text');
    });

    it('should sanitize dangerous HTML in comments', () => {
      const content = '<script>alert("XSS")</script>Normal text';
      const result = renderCommentBodyHtml(content);

      expect(result).not.toContain('<script');
      expect(result).toContain('Normal text');
    });

    it('should convert Quill bullet lists in comments', () => {
      const content = '<ol><li data-list="bullet">Comment bullet</li></ol>';
      const result = renderCommentBodyHtml(content);

      expect(result).toContain('<ul');
    });
  });

  describe('extractPlainText', () => {
    it('should remove all HTML tags', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const result = extractPlainText(html);

      expect(result).toBe('Hello World');
    });

    it('should convert <br> tags to newlines', () => {
      const html = 'Line 1<br>Line 2<br/>Line 3';
      const result = extractPlainText(html);

      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should convert paragraph breaks to newlines', () => {
      const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
      const result = extractPlainText(html);

      expect(result).toContain('Paragraph 1');
      expect(result).toContain('\n');
      expect(result).toContain('Paragraph 2');
    });

    it('should decode HTML entities', () => {
      const html = '&lt;div&gt; &amp; &quot;quotes&quot; &#39;apostrophe&#39;';
      const result = extractPlainText(html);

      expect(result).toBe('<div> & "quotes" \'apostrophe\'');
    });

    it('should convert &nbsp; to space', () => {
      const html = 'Hello&nbsp;World';
      const result = extractPlainText(html);

      expect(result).toBe('Hello World');
    });

    it('should collapse multiple spaces to single space', () => {
      const html = 'Hello     World';
      const result = extractPlainText(html);

      expect(result).toBe('Hello World');
    });

    it('should limit consecutive newlines to two', () => {
      const html = '<p>One</p><p></p><p></p><p></p><p>Two</p>';
      const result = extractPlainText(html);

      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n\s*\n\s*\n/);
    });

    it('should trim leading and trailing whitespace', () => {
      const html = '   <p>Content</p>   ';
      const result = extractPlainText(html);

      expect(result).toBe('Content');
    });

    it('should return empty string for null input', () => {
      const result = extractPlainText(null as unknown as string);
      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = extractPlainText(undefined as unknown as string);
      expect(result).toBe('');
    });

    it('should return empty string for empty input', () => {
      const result = extractPlainText('');
      expect(result).toBe('');
    });

    it('should handle nested tags correctly', () => {
      const html = '<div><span><strong>Nested</strong></span></div>';
      const result = extractPlainText(html);

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
      const result = extractPlainText(html);

      expect(result).toContain('Title');
      expect(result).toContain('Paragraph');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });
  });
});
