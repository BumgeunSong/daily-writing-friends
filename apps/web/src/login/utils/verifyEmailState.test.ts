import { describe, expect, it } from 'vitest';
import { decideVerifySuccessState } from './verifyEmailState';

describe('decideVerifySuccessState', () => {
  it('returns success for ok with email-only providers', () => {
    expect(decideVerifySuccessState({ ok: true, providers: ['email'] }))
      .toEqual({ kind: 'success' });
  });

  it('returns success for ok with multiple providers (no auto-link branch)', () => {
    expect(decideVerifySuccessState({ ok: true, providers: ['email', 'google'] }))
      .toEqual({ kind: 'success' });
  });

  it('returns locked for rate_limit', () => {
    expect(decideVerifySuccessState({ ok: false, errorCode: 'rate_limit' }))
      .toEqual({ kind: 'locked' });
  });

  it('returns error-inline with merged invalid/expired copy', () => {
    const result = decideVerifySuccessState({ ok: false, errorCode: 'invalid_or_expired' });
    expect(result.kind).toBe('error-inline');
    if (result.kind === 'error-inline') {
      expect(result.message).toMatch(/올바르지 않거나 만료/);
    }
  });

  it('returns error-inline with generic copy for unknown', () => {
    const result = decideVerifySuccessState({ ok: false, errorCode: 'unknown' });
    expect(result.kind).toBe('error-inline');
    if (result.kind === 'error-inline') {
      expect(result.message).toMatch(/잠시 후 다시 시도/);
    }
  });
});
