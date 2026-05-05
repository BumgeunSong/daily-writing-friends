import { describe, it, expect } from 'vitest';
import {
  getEmailIdentityStatus,
  hasUsablePasswordIdentity,
} from './useHasPasswordIdentity';

describe('hasUsablePasswordIdentity', () => {
  it('returns false for empty identities', () => {
    expect(hasUsablePasswordIdentity([])).toBe(false);
  });

  it('returns false for Google-only user (no email identity)', () => {
    expect(
      hasUsablePasswordIdentity([
        { provider: 'google', identity_data: { email_verified: true } },
      ]),
    ).toBe(false);
  });

  it('returns false for unverified email identity (dangling signup attempt)', () => {
    // Real Supabase response shape from a Google user who once attempted
    // email signup but never clicked the verification link.
    expect(
      hasUsablePasswordIdentity([
        { provider: 'email', identity_data: { email_verified: false } },
        { provider: 'google', identity_data: { email_verified: true } },
      ]),
    ).toBe(false);
  });

  it('returns true for verified email identity', () => {
    expect(
      hasUsablePasswordIdentity([
        { provider: 'email', identity_data: { email_verified: true } },
      ]),
    ).toBe(true);
  });

  it('returns true when both Google and verified email identity are present', () => {
    expect(
      hasUsablePasswordIdentity([
        { provider: 'google', identity_data: { email_verified: true } },
        { provider: 'email', identity_data: { email_verified: true } },
      ]),
    ).toBe(true);
  });

  it('returns false when email identity is missing identity_data', () => {
    expect(
      hasUsablePasswordIdentity([{ provider: 'email' }]),
    ).toBe(false);
  });

  it('returns false when email_verified is not strictly true (truthy values do not count)', () => {
    expect(
      hasUsablePasswordIdentity([
        { provider: 'email', identity_data: { email_verified: 'true' as unknown as boolean } },
      ]),
    ).toBe(false);
    expect(
      hasUsablePasswordIdentity([
        { provider: 'email', identity_data: { email_verified: 1 as unknown as boolean } },
      ]),
    ).toBe(false);
  });
});

describe('getEmailIdentityStatus', () => {
  it("returns 'none' when there is no email identity", () => {
    expect(getEmailIdentityStatus([])).toBe('none');
    expect(
      getEmailIdentityStatus([
        { provider: 'google', identity_data: { email_verified: true } },
      ]),
    ).toBe('none');
  });

  it("returns 'unverified' when email identity exists but is not verified", () => {
    expect(
      getEmailIdentityStatus([
        { provider: 'email', identity_data: { email_verified: false } },
      ]),
    ).toBe('unverified');
    expect(
      getEmailIdentityStatus([
        { provider: 'google', identity_data: { email_verified: true } },
        { provider: 'email', identity_data: { email_verified: false } },
      ]),
    ).toBe('unverified');
  });

  it("returns 'unverified' when email identity is missing identity_data", () => {
    expect(getEmailIdentityStatus([{ provider: 'email' }])).toBe('unverified');
  });

  it("returns 'verified' only when email identity has email_verified === true", () => {
    expect(
      getEmailIdentityStatus([
        { provider: 'email', identity_data: { email_verified: true } },
      ]),
    ).toBe('verified');
  });
});
