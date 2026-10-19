import { describe, it, expect } from 'vitest';
import { buildImageStoragePath, resolveImageContentType } from '../storagePath';

const now = new Date(2026, 4, 28, 9, 7, 3); // local 2026-05-28 09:07:03
const jpeg = { name: 'photo.jpg', type: 'image/jpeg' };

describe('buildImageStoragePath', () => {
  it('formats path as {uid}/{YYYYMMDD}/{HHMMSS}_{uniqueId}.{ext}', () => {
    expect(buildImageStoragePath('user-1', jpeg, now, 'abc')).toBe(
      'user-1/20260528/090703_abc.jpg',
    );
  });

  it('zero-pads month, day, hour, minute, second below 10', () => {
    const early = new Date(2026, 0, 5, 3, 4, 9);
    expect(buildImageStoragePath('user-1', { name: 's.png', type: 'image/png' }, early, 'x')).toBe(
      'user-1/20260105/030409_x.png',
    );
  });

  it('never puts the original filename in the key, so Korean names stay ASCII-safe', () => {
    const path = buildImageStoragePath('user-1', { name: '오늘의일기.jpg', type: 'image/jpeg' }, now, 'abc');
    expect(path).toBe('user-1/20260528/090703_abc.jpg');
    expect(path).toMatch(/^[\x20-\x7e]+$/);
  });

  it('gives two same-second uploads of the same filename different paths', () => {
    const a = buildImageStoragePath('user-1', jpeg, now, 'id-a');
    const b = buildImageStoragePath('user-1', jpeg, now, 'id-b');
    expect(a).not.toBe(b);
  });

  it('keeps users in separate folders', () => {
    expect(buildImageStoragePath('alice', jpeg, now, 'i').startsWith('alice/')).toBe(true);
    expect(buildImageStoragePath('bob', jpeg, now, 'i').startsWith('bob/')).toBe(true);
  });

  it('uses the extension that matches the resolved content type', () => {
    const path = buildImageStoragePath('u', { name: 'IMG_1.JPEG', type: 'application/octet-stream' }, now, 'i');
    expect(path.endsWith('.jpg')).toBe(true);
  });
});

describe('resolveImageContentType', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('keeps supported type %s', (type) => {
    expect(resolveImageContentType({ name: 'x.bin', type })).toBe(type);
  });

  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.JPEG', 'image/jpeg'],
    ['shot.png', 'image/png'],
    ['pic.webp', 'image/webp'],
  ])('maps octet-stream %s to %s by extension', (name, expected) => {
    expect(resolveImageContentType({ name, type: 'application/octet-stream' })).toBe(expected);
  });

  it('maps an empty browser MIME by extension', () => {
    expect(resolveImageContentType({ name: 'a.png', type: '' })).toBe('image/png');
  });
});
