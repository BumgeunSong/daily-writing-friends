import { describe, it, expect } from 'vitest';
import { sanitizeStorageFileName, MAX_FILENAME_LENGTH } from '../storageFileName';

describe('sanitizeStorageFileName', () => {
  it('passes a normal filename through unchanged', () => {
    expect(sanitizeStorageFileName('photo.jpg')).toBe('photo.jpg');
  });

  it('replaces forward slashes with underscores', () => {
    expect(sanitizeStorageFileName('foo/bar.jpg')).toBe('foo_bar.jpg');
  });

  it('replaces backslashes with underscores', () => {
    expect(sanitizeStorageFileName('foo\\bar.jpg')).toBe('foo_bar.jpg');
  });

  it('collapses parent-traversal sequences', () => {
    expect(sanitizeStorageFileName('..foo.jpg')).toBe('_foo.jpg');
    expect(sanitizeStorageFileName('....foo.jpg')).toBe('_foo.jpg');
  });

  it('neutralizes a full path-traversal payload', () => {
    expect(sanitizeStorageFileName('../../etc/passwd.jpg')).toBe('____etc_passwd.jpg');
  });

  it('strips control characters including null byte', () => {
    expect(sanitizeStorageFileName('photo\x00.jpg')).toBe('photo.jpg');
    expect(sanitizeStorageFileName('photo\x1f.jpg')).toBe('photo.jpg');
    expect(sanitizeStorageFileName('photo\n.jpg')).toBe('photo.jpg');
  });

  it('preserves Korean characters', () => {
    expect(sanitizeStorageFileName('한글사진.jpg')).toBe('한글사진.jpg');
  });

  it('preserves spaces and punctuation that Firebase Storage accepts', () => {
    expect(sanitizeStorageFileName('my photo (1).jpg')).toBe('my photo (1).jpg');
  });

  it('clamps overly long filenames', () => {
    const long = 'a'.repeat(200) + '.jpg';
    const result = sanitizeStorageFileName(long);
    expect(result.length).toBe(MAX_FILENAME_LENGTH);
  });

  it('returns fallback when the input collapses to empty', () => {
    expect(sanitizeStorageFileName('')).toBe('image');
    expect(sanitizeStorageFileName('\x00\x01\x02')).toBe('image');
  });
});
