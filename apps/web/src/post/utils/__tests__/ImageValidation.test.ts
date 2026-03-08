import { describe, it, expect } from 'vitest';
import {
  validateFileSize,
  validateProcessedFileSize,
  validateFileType,
  aggregateResults,
  getValidationMessage,
  MAX_RAW_FILE_SIZE,
  MAX_PROCESSED_FILE_SIZE,
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

  it('allows image/gif', () => {
    const file = createFile('photo.gif', 100, 'image/gif');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('allows image/webp', () => {
    const file = createFile('photo.webp', 100, 'image/webp');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('allows .heic by extension even without image MIME', () => {
    const file = createFile('photo.heic', 100, 'application/octet-stream');
    expect(validateFileType(file)).toEqual({ valid: true });
  });

  it('allows .heif by extension even without image MIME', () => {
    const file = createFile('photo.HEIF', 100, '');
    expect(validateFileType(file)).toEqual({ valid: true });
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

  it('returns fallback for unknown reason', () => {
    expect(getValidationMessage('unknown')).toBe('파일을 업로드할 수 없습니다.');
  });
});
