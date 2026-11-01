import type * as Sentry from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { isDevelopmentFirebaseError } from './sentry';

const firebaseEvent = (environment: string, type = 'FirebaseError'): Sentry.Event => ({
  environment,
  exception: { values: [{ type, value: 'Installations: API key not valid (installations/request-failed)' }] },
});

describe('isDevelopmentFirebaseError', () => {
  it('development 환경의 FirebaseError면 true를 반환한다', () => {
    expect(isDevelopmentFirebaseError(firebaseEvent('development'))).toBe(true);
  });

  it('production 환경의 FirebaseError면 false를 반환한다', () => {
    expect(isDevelopmentFirebaseError(firebaseEvent('production'))).toBe(false);
  });

  it('development 환경이어도 FirebaseError가 아니면 false를 반환한다', () => {
    expect(isDevelopmentFirebaseError(firebaseEvent('development', 'TypeError'))).toBe(false);
  });

  it('예외 정보가 없으면 false를 반환한다', () => {
    expect(isDevelopmentFirebaseError({ environment: 'development' })).toBe(false);
  });
});
