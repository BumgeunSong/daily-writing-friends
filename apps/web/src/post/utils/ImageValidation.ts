const MAX_RAW_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PROCESSED_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type ValidationReason =
  | 'exceeds_raw_limit'
  | 'exceeds_processed_limit'
  | 'not_image'
  | 'unsupported_format';

type ValidationResult = { valid: true } | { valid: false; reason: ValidationReason };

function validateFileSize(
  file: File | Blob,
  maxRawBytes: number = MAX_RAW_FILE_SIZE,
): ValidationResult {
  if (file.size > maxRawBytes) {
    return { valid: false, reason: 'exceeds_raw_limit' };
  }
  return { valid: true };
}

function validateProcessedFileSize(
  file: File | Blob,
  maxProcessedBytes: number = MAX_PROCESSED_FILE_SIZE,
): ValidationResult {
  if (file.size > maxProcessedBytes) {
    return { valid: false, reason: 'exceeds_processed_limit' };
  }
  return { valid: true };
}

const SUPPORTED_EXTENSION_PATTERN = /\.(jpe?g|png|webp)$/i;
const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Drives the more specific "지원하지 않는 형식" message when MIME is missing
// (e.g., HEIC dragged from Photos.app on macOS often arrives with empty type).
const KNOWN_UNSUPPORTED_IMAGE_EXTENSION_PATTERN = /\.(heic|heif|gif)$/i;

function validateFileType(file: File): ValidationResult {
  if (SUPPORTED_MIME_TYPES.has(file.type) || SUPPORTED_EXTENSION_PATTERN.test(file.name)) {
    return { valid: true };
  }

  const isImageMime = file.type.startsWith('image/');
  const isKnownUnsupportedExtension = KNOWN_UNSUPPORTED_IMAGE_EXTENSION_PATTERN.test(file.name);
  if (isImageMime || isKnownUnsupportedExtension) {
    return { valid: false, reason: 'unsupported_format' };
  }
  return { valid: false, reason: 'not_image' };
}

interface MultiFileResult {
  succeeded: number;
  failed: number;
}

function aggregateResults(results: Array<{ success: boolean }>): MultiFileResult {
  return results.reduce(
    (acc, r) => ({
      succeeded: acc.succeeded + (r.success ? 1 : 0),
      failed: acc.failed + (r.success ? 0 : 1),
    }),
    { succeeded: 0, failed: 0 },
  );
}

const validationMessages: Record<string, string> = {
  exceeds_raw_limit: '파일이 너무 큽니다.',
  exceeds_processed_limit: '처리 후에도 파일이 큽니다.',
  not_image: '이미지 파일만 업로드할 수 있습니다.',
  unsupported_format: '지원하지 않는 형식입니다. JPEG, PNG, WebP로 저장 후 다시 시도해주세요.',
};

function getValidationMessage(reason: string): string {
  return validationMessages[reason] ?? '파일을 업로드할 수 없습니다.';
}

export {
  validateFileSize,
  validateProcessedFileSize,
  validateFileType,
  aggregateResults,
  getValidationMessage,
  MAX_RAW_FILE_SIZE,
  MAX_PROCESSED_FILE_SIZE,
};
export type { ValidationResult, MultiFileResult };
