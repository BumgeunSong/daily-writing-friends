import { describe, it, expect } from 'vitest';
import {
  getEmailIdentityStatus,
  hasUsablePasswordIdentity,
} from './useHasPasswordIdentity';

describe('hasUsablePasswordIdentity', () => {
  it('returns false for empty identities', () => {
    expect(hasUsablePasswordIdentity({ identities: [] })).toBe(false);
  });

  it('returns false for Google-only user (no email identity)', () => {
    expect(
      hasUsablePasswordIdentity({
        email_confirmed_at: '2026-05-10T00:00:00Z',
        identities: [{ provider: 'google', identity_data: { email_verified: true } }],
      }),
    ).toBe(false);
  });

  it('returns false for unverified email identity (dangling signup attempt)', () => {
    // signUp without OTP completion: email_confirmed_at is null AND
    // identity_data.email_verified is false. signInWithPassword would fail.
    expect(
      hasUsablePasswordIdentity({
        email_confirmed_at: null,
        identities: [
          { provider: 'email', identity_data: { email_verified: false } },
          { provider: 'google', identity_data: { email_verified: true } },
        ],
      }),
    ).toBe(false);
  });

  it('returns true for verified email identity', () => {
    expect(
      hasUsablePasswordIdentity({
        email_confirmed_at: '2026-05-10T00:00:00Z',
        identities: [{ provider: 'email', identity_data: { email_verified: true } }],
      }),
    ).toBe(true);
  });

  it('returns true when both Google and verified email identity are present', () => {
    expect(
      hasUsablePasswordIdentity({
        email_confirmed_at: '2026-05-10T00:00:00Z',
        identities: [
          { provider: 'google', identity_data: { email_verified: true } },
          { provider: 'email', identity_data: { email_verified: true } },
        ],
      }),
    ).toBe(true);
  });

  it('returns false when email identity is missing identity_data and email is not confirmed', () => {
    expect(
      hasUsablePasswordIdentity({
        email_confirmed_at: null,
        identities: [{ provider: 'email' }],
      }),
    ).toBe(false);
  });

  it('returns false when email_verified is not strictly true (truthy values do not count) and email is not confirmed', () => {
    expect(
      hasUsablePasswordIdentity({
        email_confirmed_at: null,
        identities: [
          { provider: 'email', identity_data: { email_verified: 'true' as unknown as boolean } },
        ],
      }),
    ).toBe(false);
    expect(
      hasUsablePasswordIdentity({
        email_confirmed_at: null,
        identities: [
          { provider: 'email', identity_data: { email_verified: 1 as unknown as boolean } },
        ],
      }),
    ).toBe(false);
  });

  it('returns true for OAuth-linked user who reset password via OTP (per-identity flag still false but email_confirmed_at set)', () => {
    // Real Supabase response shape: Google user → setPasswordForCurrentUser
    // → resetPasswordForEmail → verifyOtp(recovery) → updateUser({password}).
    // identity_data.email_verified stays false because verifyOtp(recovery)
    // doesn't update the per-identity flag, but email_confirmed_at was set
    // from the original Google login (and signInWithPassword succeeds).
    expect(
      hasUsablePasswordIdentity({
        email_confirmed_at: '2026-05-10T00:00:00Z',
        identities: [
          { provider: 'google', identity_data: { email_verified: true } },
          { provider: 'email', identity_data: { email_verified: false } },
        ],
      }),
    ).toBe(true);
  });
});

describe('getEmailIdentityStatus', () => {
  it("returns 'none' when there is no email identity", () => {
    expect(getEmailIdentityStatus({ identities: [] })).toBe('none');
    expect(
      getEmailIdentityStatus({
        email_confirmed_at: '2026-05-10T00:00:00Z',
        identities: [{ provider: 'google', identity_data: { email_verified: true } }],
      }),
    ).toBe('none');
  });

  it("returns 'none' when user is null", () => {
    expect(getEmailIdentityStatus(null)).toBe('none');
  });

  it("returns 'unverified' when email identity exists but neither signal is verified", () => {
    expect(
      getEmailIdentityStatus({
        email_confirmed_at: null,
        identities: [{ provider: 'email', identity_data: { email_verified: false } }],
      }),
    ).toBe('unverified');
    expect(
      getEmailIdentityStatus({
        email_confirmed_at: null,
        identities: [
          { provider: 'google', identity_data: { email_verified: true } },
          { provider: 'email', identity_data: { email_verified: false } },
        ],
      }),
    ).toBe('unverified');
  });

  it("returns 'unverified' when email identity is missing identity_data and email is not confirmed", () => {
    expect(
      getEmailIdentityStatus({
        email_confirmed_at: null,
        identities: [{ provider: 'email' }],
      }),
    ).toBe('unverified');
  });

  it("returns 'verified' when per-identity email_verified === true", () => {
    expect(
      getEmailIdentityStatus({
        email_confirmed_at: '2026-05-10T00:00:00Z',
        identities: [{ provider: 'email', identity_data: { email_verified: true } }],
      }),
    ).toBe('verified');
  });

  it("returns 'verified' when email_confirmed_at is set even if per-identity flag is false (post-recovery flow)", () => {
    expect(
      getEmailIdentityStatus({
        email_confirmed_at: '2026-05-10T00:00:00Z',
        identities: [
          { provider: 'google', identity_data: { email_verified: true } },
          { provider: 'email', identity_data: { email_verified: false } },
        ],
      }),
    ).toBe('verified');
  });
});
