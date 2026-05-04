import { describe, it, expect } from 'vitest';
import { validatePassword, passwordChecks } from './passwordValidation';

describe('passwordChecks', () => {
  it('returns all checks for empty input', () => {
    expect(passwordChecks('')).toEqual({
      isLongEnough: false,
      hasLetter: false,
      hasNumber: false,
    });
  });

  it('flags 8+ chars', () => {
    expect(passwordChecks('abcd1234').isLongEnough).toBe(true);
    expect(passwordChecks('abc12').isLongEnough).toBe(false);
  });

  it('flags letter presence', () => {
    expect(passwordChecks('12345678').hasLetter).toBe(false);
    expect(passwordChecks('abc12345').hasLetter).toBe(true);
  });

  it('flags number presence', () => {
    expect(passwordChecks('abcdefgh').hasNumber).toBe(false);
    expect(passwordChecks('abcd1234').hasNumber).toBe(true);
  });
});

describe('validatePassword', () => {
  it('returns null when all rules pass', () => {
    expect(validatePassword('abcd1234')).toBeNull();
  });

  it('returns Korean message when too short', () => {
    expect(validatePassword('ab12')).toBe('비밀번호는 8자 이상이어야 합니다.');
  });

  it('returns Korean message when missing letter', () => {
    expect(validatePassword('12345678')).toBe('비밀번호는 영문을 포함해야 합니다.');
  });

  it('returns Korean message when missing number', () => {
    expect(validatePassword('abcdefgh')).toBe('비밀번호는 숫자를 포함해야 합니다.');
  });
});
