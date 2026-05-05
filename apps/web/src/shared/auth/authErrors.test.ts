import { describe, it, expect } from 'vitest';
import { isAlreadyRegisteredError, mapSetPasswordErrorToKorean } from './authErrors';

describe('mapSetPasswordErrorToKorean', () => {
  it('returns specific message for same_password error code', () => {
    const err = Object.assign(new Error('New password should be different from the old password.'), {
      code: 'same_password',
    });
    expect(mapSetPasswordErrorToKorean(err)).toBe(
      '이미 이 비밀번호로 등록되어 있어요. 다른 비밀번호를 시도해주세요.',
    );
  });

  it('falls back to message text when code is missing (same-password phrasing)', () => {
    const err = new Error('New password should be different from the old password.');
    expect(mapSetPasswordErrorToKorean(err)).toBe(
      '이미 이 비밀번호로 등록되어 있어요. 다른 비밀번호를 시도해주세요.',
    );
  });

  it('returns specific message for weak_password error code', () => {
    const err = Object.assign(new Error('Password is too weak'), { code: 'weak_password' });
    expect(mapSetPasswordErrorToKorean(err)).toBe(
      '비밀번호가 너무 약해요. 더 복잡한 비밀번호를 사용해주세요.',
    );
  });

  it('returns generic Korean message for unknown errors', () => {
    expect(mapSetPasswordErrorToKorean(new Error('Internal server error'))).toBe(
      '저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
    );
  });

  it('returns generic message for non-Error throwables', () => {
    expect(mapSetPasswordErrorToKorean('boom')).toBe(
      '저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
    );
    expect(mapSetPasswordErrorToKorean(null)).toBe(
      '저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
    );
  });
});

describe('isAlreadyRegisteredError', () => {
  it('detects user_already_exists error code', () => {
    const err = Object.assign(new Error('User already registered'), {
      code: 'user_already_exists',
    });
    expect(isAlreadyRegisteredError(err)).toBe(true);
  });

  it('detects "User already registered" message', () => {
    expect(isAlreadyRegisteredError(new Error('User already registered'))).toBe(true);
  });

  it('detects "already registered" substring (case-insensitive)', () => {
    expect(isAlreadyRegisteredError(new Error('Email Already Registered'))).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isAlreadyRegisteredError(new Error('Network error'))).toBe(false);
    expect(isAlreadyRegisteredError(new Error('Invalid email'))).toBe(false);
  });

  it('returns false for non-Error throwables', () => {
    expect(isAlreadyRegisteredError(null)).toBe(false);
    expect(isAlreadyRegisteredError(undefined)).toBe(false);
    expect(isAlreadyRegisteredError('boom')).toBe(false);
  });
});
