import { describe, it, expect } from 'vitest';
import { extractFirstImageUrl } from './postUtils';

describe('extractFirstImageUrl', () => {
  it('returns src of the first image', () => {
    const html = '<p>Hello</p><img src="https://example.com/photo.jpg" />';
    expect(extractFirstImageUrl(html)).toBe('https://example.com/photo.jpg');
  });

  it('returns first image when multiple images exist', () => {
    const html = '<img src="https://first.com/a.png" /><img src="https://second.com/b.png" />';
    expect(extractFirstImageUrl(html)).toBe('https://first.com/a.png');
  });

  it('returns null when no image exists', () => {
    expect(extractFirstImageUrl('<p>No images here</p>')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractFirstImageUrl('')).toBeNull();
  });

  it('returns null for plain text without HTML', () => {
    expect(extractFirstImageUrl('just plain text')).toBeNull();
  });

  it('handles image nested inside other tags', () => {
    const html = '<div><p><span><img src="https://nested.com/img.webp" /></span></p></div>';
    expect(extractFirstImageUrl(html)).toBe('https://nested.com/img.webp');
  });

  it('handles image with additional attributes', () => {
    const html = '<img alt="photo" width="100" src="https://example.com/pic.png" class="thumb" />';
    expect(extractFirstImageUrl(html)).toBe('https://example.com/pic.png');
  });

  it('returns null when img tag has no src', () => {
    expect(extractFirstImageUrl('<img alt="no src" />')).toBeNull();
  });
});
