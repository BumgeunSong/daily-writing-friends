import { describe, it, expect } from 'vitest';
import { mapAuthErrorToKorean } from './useEmailLogin';

describe('mapAuthErrorToKorean', () => {
  it('maps "Email not confirmed" to verification message', () => {
    expect(mapAuthErrorToKorean(new Error('Email not confirmed'))).toBe(
      '이메일 인증이 필요합니다.',
    );
  });

  it('matches case-insensitively', () => {
    expect(mapAuthErrorToKorean(new Error('EMAIL NOT CONFIRMED'))).toBe(
      '이메일 인증이 필요합니다.',
    );
  });

  it('maps "Invalid login credentials" to credential mismatch message', () => {
    expect(mapAuthErrorToKorean(new Error('Invalid login credentials'))).toBe(
      '이메일 또는 비밀번호가 올바르지 않습니다.',
    );
  });

  it('returns generic fallback for unknown error', () => {
    expect(mapAuthErrorToKorean(new Error('Network failure'))).toBe(
      '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  it('returns generic fallback for non-Error value', () => {
    expect(mapAuthErrorToKorean('something weird')).toBe(
      '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  it('returns generic fallback for null', () => {
    expect(mapAuthErrorToKorean(null)).toBe(
      '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.',
    );
  });
});
