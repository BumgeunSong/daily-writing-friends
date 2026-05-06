/**
 * Pure validators for the contact-info segmented control on /join/onboarding.
 * Tested by `contactValidation.test.ts`.
 */

const KAKAO_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * Returns the digits-only phone string if it has 10 or 11 digits, else null.
 * Strips all non-digit characters first (parens, dashes, spaces, dots).
 */
export function validatePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11) return null;
  return digits;
}

/**
 * Returns the trimmed Kakao ID if it is 1-50 chars and matches `[A-Za-z0-9._-]`, else null.
 * The format constraint mirrors the DB CHECK `users_kakao_id_format`.
 */
export function validateKakaoId(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 50) return null;
  if (!KAKAO_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}
