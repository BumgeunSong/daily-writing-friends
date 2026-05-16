const MAX_FILENAME_LENGTH = 100;
const FALLBACK_NAME = 'image';

/**
 * Sanitize a user-supplied filename before using it as a Firebase Storage path segment.
 * Strips path separators, parent-traversal sequences, and control characters so a
 * crafted filename cannot escape its date folder or collide with paths in other buckets.
 * Preserves Unicode letters (e.g., Korean) so users still recognize their files.
 */
const sanitizeStorageFileName = (rawName: string): string => {
  const sanitized = rawName
    .replace(/[\\/]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/[\x00-\x1f]/g, '');
  const clamped = sanitized.slice(0, MAX_FILENAME_LENGTH);
  return clamped || FALLBACK_NAME;
};

export { sanitizeStorageFileName, MAX_FILENAME_LENGTH };
