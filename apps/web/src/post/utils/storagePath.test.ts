import { describe, it, expect } from 'vitest';
import { buildImageStoragePath } from './storagePath';

const FIXED_DATE = new Date('2026-05-28T09:07:03Z');

describe('buildImageStoragePath', () => {
  it('formats path as {prefix}/{YYYYMMDD}/{HHMMSS}_{fileName}', () => {
    const now = new Date(2026, 4, 28, 9, 7, 3); // local 2026-05-28 09:07:03
    expect(buildImageStoragePath('postImages', 'photo.jpg', now)).toBe(
      'postImages/20260528/090703_photo.jpg',
    );
  });

  it('zero-pads month, day, hour, minute, second below 10', () => {
    const now = new Date(2026, 0, 5, 3, 4, 9); // local 2026-01-05 03:04:09
    expect(buildImageStoragePath('feedbackScreenshots', 'shot.png', now)).toBe(
      'feedbackScreenshots/20260105/030409_shot.png',
    );
  });

  it('sanitizes filenames containing path separators', () => {
    const result = buildImageStoragePath('postImages', '../escape/photo.jpg', FIXED_DATE);
    expect(result.endsWith('__escape_photo.jpg')).toBe(true);
    expect(result).not.toContain('..');
    expect(result).not.toContain('/escape/');
  });

  it('falls back to a default name when the sanitized filename would be empty', () => {
    const result = buildImageStoragePath('postImages', '\x01\x02\x03', FIXED_DATE);
    expect(result.endsWith('_image')).toBe(true);
  });

  it('preserves Unicode (Korean) characters in the filename', () => {
    const result = buildImageStoragePath('postImages', '오늘의일기.jpg', FIXED_DATE);
    expect(result.endsWith('_오늘의일기.jpg')).toBe(true);
  });

  it('produces a different path for different prefixes given the same time and filename', () => {
    const postsPath = buildImageStoragePath('postImages', 'a.jpg', FIXED_DATE);
    const screenshotsPath = buildImageStoragePath('feedbackScreenshots', 'a.jpg', FIXED_DATE);
    expect(postsPath.startsWith('postImages/')).toBe(true);
    expect(screenshotsPath.startsWith('feedbackScreenshots/')).toBe(true);
    expect(postsPath).not.toBe(screenshotsPath);
  });
});
