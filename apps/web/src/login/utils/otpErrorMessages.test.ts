import { describe, it, expect } from 'vitest';
import { toKoreanErrorMessage } from './otpErrorMessages';

describe('toKoreanErrorMessage', () => {
  describe('when error indicates unregistered email', () => {
    it('returns "등록되지 않은 이메일입니다." regardless of step', () => {
      const error = new Error('Signups not allowed for this instance');
      expect(toKoreanErrorMessage(error, 'email')).toBe('등록되지 않은 이메일입니다.');
      expect(toKoreanErrorMessage(error, 'code')).toBe('등록되지 않은 이메일입니다.');
    });
  });

  describe('when error occurs in code verification step', () => {
    it('returns "인증 코드가 올바르지 않습니다." for generic Error', () => {
      const error = new Error('Token has expired or is invalid');
      expect(toKoreanErrorMessage(error, 'code')).toBe('인증 코드가 올바르지 않습니다.');
    });
  });

  describe('when error occurs in email step', () => {
    it('returns generic Korean fallback for unknown errors', () => {
      const error = new Error('Network request failed');
      expect(toKoreanErrorMessage(error, 'email')).toBe('오류가 발생했습니다. 다시 시도해주세요.');
    });
  });

  describe('when thrown value is not an Error instance', () => {
    it('returns generic Korean fallback for string throws', () => {
      expect(toKoreanErrorMessage('something broke', 'email')).toBe('오류가 발생했습니다. 다시 시도해주세요.');
    });

    it('returns code-specific message for string throws in code step', () => {
      expect(toKoreanErrorMessage('something broke', 'code')).toBe('인증 코드가 올바르지 않습니다.');
    });
  });
});
