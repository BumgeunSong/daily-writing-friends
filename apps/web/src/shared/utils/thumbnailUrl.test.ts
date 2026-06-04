import { describe, it, expect } from 'vitest';
import {
  extractStoragePath,
  deriveThumbPath,
  isFirebaseStorageUrl,
  THUMB_SIZES,
} from './thumbnailUrl';

describe('isFirebaseStorageUrl', () => {
  it('returns true for a Firebase Storage download URL', () => {
    expect(
      isFirebaseStorageUrl(
        'https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Ffile.jpg?alt=media',
      ),
    ).toBe(true);
  });

  it('returns false for non-Firebase URLs', () => {
    expect(isFirebaseStorageUrl('https://cdn.example.com/image.jpg')).toBe(false);
  });
});

describe('extractStoragePath', () => {
  it('decodes the storage path from a download URL and drops the query string', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/dwf.appspot.com/o/postImages%2F20260421%2F143000_photo.jpg?alt=media&token=abc';
    expect(extractStoragePath(url)).toBe('postImages/20260421/143000_photo.jpg');
  });

  it('returns null for URLs without /o/ segment', () => {
    expect(extractStoragePath('https://firebasestorage.googleapis.com/v0/b/dwf')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(extractStoragePath('not a url')).toBeNull();
  });

  it('handles nested folders with multiple url-encoded slashes', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/bucket/o/a%2Fb%2Fc%2Ffile.jpg';
    expect(extractStoragePath(url)).toBe('a/b/c/file.jpg');
  });
});

describe('deriveThumbPath', () => {
  it('inserts the size suffix before the extension for POST size', () => {
    expect(deriveThumbPath('postImages/20260421/photo.jpg', THUMB_SIZES.POST)).toBe(
      'postImages/20260421/photo_600x338.jpg',
    );
  });

  it('inserts the size suffix before the extension for AVATAR size', () => {
    expect(deriveThumbPath('avatars/user1.png', THUMB_SIZES.AVATAR)).toBe(
      'avatars/user1_128x128.png',
    );
  });

  it('uses only the last dot as the extension boundary', () => {
    expect(deriveThumbPath('folder/file.name.with.dots.jpg', THUMB_SIZES.POST)).toBe(
      'folder/file.name.with.dots_600x338.jpg',
    );
  });

  it('returns null for paths without a file extension', () => {
    expect(deriveThumbPath('folder/noext', THUMB_SIZES.POST)).toBeNull();
  });

  it('preserves the original path prefix verbatim', () => {
    expect(deriveThumbPath('deeply/nested/path/file.webp', THUMB_SIZES.POST)).toBe(
      'deeply/nested/path/file_600x338.webp',
    );
  });
});
