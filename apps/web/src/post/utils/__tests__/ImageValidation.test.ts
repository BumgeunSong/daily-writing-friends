import { describe, it, expect } from 'vitest';
import {
  validateFileSize,
  validateProcessedFileSize,
  validateFileType,
  aggregateResults,
  getValidationMessage,
  MAX_RAW_FILE_SIZE,
  MAX_PROCESSED_FILE_SIZE,
  SUPPORTED_ACCEPT_ATTRIBUTE,
  SUPPORTED_FORMAT_LABEL,
} from '../ImageValidation';

function createFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('validateFileSize', () => {
  it('passes files under 20MB', () => {
    const file = createFile('photo.jpg', 10 * 1024 * 1024, 'image/jpeg');
    expect(validateFileSize(file)).toEqual({ valid: true });
  });

  it('passes files exactly at 20MB', () => {
    const file = createFile('photo.jpg', MAX_RAW_FILE_SIZE, 'image/jpeg');
    expect(validateFileSize(file)).toEqual({ valid: true });
  });

  it('rejects files over 20MB', () => {
    const file = createFile('photo.jpg', MAX_RAW_FILE_SIZE + 1, 'image/jpeg');
    expect(validateFileSize(file)).toEqual({ valid: false, reason: 'exceeds_raw_limit' });
  });

  it('accepts custom max size', () => {
    const file = createFile('photo.jpg', 6 * 1024 * 1024, 'image/jpeg');
    expect(validateFileSize(file, 5 * 1024 * 1024)).toEqual({
      valid: false,
      reason: 'exceeds_raw_limit',
    });
  });
});

describe('validateProcessedFileSize', () => {
  it('passes files under 5MB', () => {
    const file = createFile('photo.jpg', 3 * 1024 * 1024, 'image/jpeg');
    expect(validateProcessedFileSize(file)).toEqual({ valid: true });
  });

  it('rejects files over 5MB', () => {
    const file = createFile('photo.jpg', MAX_PROCESSED_FILE_SIZE + 1, 'image/jpeg');
    expect(validateProcessedFileSize(file)).toEqual({
      valid: false,
      reason: 'exceeds_processed_limit',
    });
  });
});

describe('validateFileType', () => {
  it('allows image/jpeg', () => {
    const file = createFile('photo.jpg', 100, 'image/jpeg');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('allows image/png', () => {
    const file = createFile('photo.png', 100, 'image/png');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('rejects image/gif', () => {
    const file = createFile('photo.gif', 100, 'image/gif');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'unsupported_format' });
  });

  it('rejects .gif by extension regardless of MIME', () => {
    const file = createFile('photo.GIF', 100, '');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'unsupported_format' });
  });

  it('allows image/webp', () => {
    const file = createFile('photo.webp', 100, 'image/webp');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('rejects .heic by extension even when MIME is image/heic', () => {
    const file = createFile('photo.heic', 100, 'image/heic');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'unsupported_format' });
  });

  it('rejects .heif by extension regardless of MIME', () => {
    const file = createFile('photo.HEIF', 100, '');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'unsupported_format' });
  });

  it('rejects image/heic MIME without .heic extension', () => {
    const file = createFile('photo', 100, 'image/heic');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'unsupported_format' });
  });

  it('rejects image/heif MIME without .heif extension', () => {
    const file = createFile('photo', 100, 'image/heif');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'unsupported_format' });
  });

  it('rejects image/avif as unsupported_format (not in allow-list)', () => {
    const file = createFile('photo.avif', 100, 'image/avif');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'unsupported_format' });
  });

  it('rejects image/svg+xml as unsupported_format (not in allow-list)', () => {
    const file = createFile('drawing.svg', 100, 'image/svg+xml');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'unsupported_format' });
  });

  it('rejects image/tiff as unsupported_format (not in allow-list)', () => {
    const file = createFile('scan.tif', 100, 'image/tiff');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'unsupported_format' });
  });

  it('allows .jpg extension as JPEG alias', () => {
    const file = createFile('photo.jpg', 100, 'image/jpeg');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('allows JPEG by extension when MIME is empty', () => {
    const file = createFile('photo.jpeg', 100, '');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('allows JPEG by extension when MIME is application/octet-stream', () => {
    const file = createFile('photo.jpg', 100, 'application/octet-stream');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('rejects supported extension when MIME is a non-image type', () => {
    // e.g. notes.txt renamed to notes.jpg — extension alone must not bypass MIME check
    const file = createFile('notes.jpg', 100, 'text/plain');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'not_image' });
  });

  it('rejects supported extension when MIME is application/pdf', () => {
    const file = createFile('doc.png', 100, 'application/pdf');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'not_image' });
  });

  it('rejects non-image files', () => {
    const file = createFile('document.pdf', 100, 'application/pdf');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'not_image' });
  });

  it('rejects text files', () => {
    const file = createFile('notes.txt', 100, 'text/plain');
    expect(validateFileType(file)).toEqual({ valid: false, reason: 'not_image' });
  });
});

describe('aggregateResults', () => {
  it('counts all successes', () => {
    const results = [{ success: true }, { success: true }, { success: true }];
    expect(aggregateResults(results)).toEqual({ succeeded: 3, failed: 0 });
  });

  it('counts all failures', () => {
    const results = [{ success: false }, { success: false }];
    expect(aggregateResults(results)).toEqual({ succeeded: 0, failed: 2 });
  });

  it('counts mixed results', () => {
    const results = [
      { success: true },
      { success: false },
      { success: true },
      { success: false },
      { success: true },
    ];
    expect(aggregateResults(results)).toEqual({ succeeded: 3, failed: 2 });
  });

  it('handles empty array', () => {
    expect(aggregateResults([])).toEqual({ succeeded: 0, failed: 0 });
  });
});

describe('getValidationMessage', () => {
  it('returns correct message for exceeds_raw_limit', () => {
    expect(getValidationMessage('exceeds_raw_limit')).toBe('파일이 너무 큽니다.');
  });

  it('returns correct message for exceeds_processed_limit', () => {
    expect(getValidationMessage('exceeds_processed_limit')).toBe('처리 후에도 파일이 큽니다.');
  });

  it('returns correct message for not_image', () => {
    expect(getValidationMessage('not_image')).toBe('이미지 파일만 업로드할 수 있습니다.');
  });

  it('returns correct message for unsupported_format', () => {
    expect(getValidationMessage('unsupported_format')).toBe(
      '지원하지 않는 형식입니다. JPEG, PNG, WebP로 저장 후 다시 시도해주세요.',
    );
  });

  it('returns fallback for unknown reason', () => {
    expect(getValidationMessage('unknown')).toBe('파일을 업로드할 수 없습니다.');
  });
});

describe('supported-formats coherence (single source of truth)', () => {
  const ACCEPTED_MIMES = SUPPORTED_ACCEPT_ATTRIBUTE.split(',');

  it('every MIME advertised in the picker attribute also passes validateFileType', () => {
    for (const mime of ACCEPTED_MIMES) {
      const file = new File([new ArrayBuffer(1)], 'photo', { type: mime });
      expect(validateFileType(file)).toEqual({ valid: true });
    }
  });

  it('every format named in the user-facing label is also in the picker attribute', () => {
    // e.g. label "JPEG, PNG, WebP" → picker advertises image/jpeg, image/png, image/webp
    const labels = SUPPORTED_FORMAT_LABEL.split(', ');
    expect(labels.length).toBe(ACCEPTED_MIMES.length);
    for (const label of labels) {
      const expectedMime = `image/${label.toLowerCase()}`;
      expect(ACCEPTED_MIMES).toContain(expectedMime);
    }
  });

  it('unsupported_format message advertises exactly the same formats as the picker', () => {
    expect(getValidationMessage('unsupported_format')).toContain(SUPPORTED_FORMAT_LABEL);
  });
});
