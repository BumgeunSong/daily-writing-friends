import { describe, expect, it } from 'vitest';
import { validateKakaoId, validatePhone } from './contactValidation';

describe('validatePhone', () => {
  it('returns null for under 10 digits', () => {
    expect(validatePhone('123456789')).toBeNull();
  });

  it('accepts 10 digits', () => {
    expect(validatePhone('0212345678')).toBe('0212345678');
  });

  it('accepts 11 digits', () => {
    expect(validatePhone('01012345678')).toBe('01012345678');
  });

  it('returns null for 12+ digits', () => {
    expect(validatePhone('010123456789')).toBeNull();
  });

  it('strips dashes and spaces', () => {
    expect(validatePhone('010-1234-5678')).toBe('01012345678');
    expect(validatePhone(' 010 1234 5678 ')).toBe('01012345678');
  });

  it('strips parens and dots', () => {
    expect(validatePhone('(010).1234.5678')).toBe('01012345678');
  });

  it('returns null for empty string', () => {
    expect(validatePhone('')).toBeNull();
  });

  it('returns null for non-digit only', () => {
    expect(validatePhone('abc-defg-hij')).toBeNull();
  });
});

describe('validateKakaoId', () => {
  it('returns null for empty string', () => {
    expect(validateKakaoId('')).toBeNull();
  });

  it('returns null for whitespace-only', () => {
    expect(validateKakaoId('   ')).toBeNull();
  });

  it('accepts a valid id with allowed chars', () => {
    expect(validateKakaoId('valid_id-123.kakao')).toBe('valid_id-123.kakao');
  });

  it('trims surrounding whitespace', () => {
    expect(validateKakaoId('  hello  ')).toBe('hello');
  });

  it('accepts 50-char id', () => {
    const fifty = 'a'.repeat(50);
    expect(validateKakaoId(fifty)).toBe(fifty);
  });

  it('rejects 51-char id', () => {
    expect(validateKakaoId('a'.repeat(51))).toBeNull();
  });

  it('rejects forbidden punctuation', () => {
    expect(validateKakaoId('id with space')).toBeNull();
    expect(validateKakaoId('id<script>')).toBeNull();
    expect(validateKakaoId('id@email.com')).toBeNull();
  });

  it('rejects emoji or non-ASCII', () => {
    expect(validateKakaoId('id🎉')).toBeNull();
    expect(validateKakaoId('한글아이디')).toBeNull();
  });
});
