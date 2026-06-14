import { describe, expect, it } from 'vitest';
import { authSessionFromEmail, testEmailFor, userIdFromEmail } from './auth';

describe('userIdFromEmail', () => {
  it('returns the local part of a standard email', () => {
    expect(userIdFromEmail('alice@test.local')).toBe('alice');
  });

  it('returns the input when no @ is present', () => {
    expect(userIdFromEmail('plain')).toBe('plain');
  });

  it('rejects empty local-part', () => {
    expect(() => userIdFromEmail('@test.local')).toThrow();
  });
});

describe('testEmailFor', () => {
  it('round-trips with userIdFromEmail', () => {
    expect(userIdFromEmail(testEmailFor('alice'))).toBe('alice');
  });
});

describe('authSessionFromEmail', () => {
  it('produces a session whose userId is the email local-part', () => {
    expect(authSessionFromEmail(testEmailFor('alice'))).toEqual({
      userId: 'alice',
      email: 'alice@test.local',
    });
  });

  it('throws on empty local-part — the cross-field invariant is enforced at construction', () => {
    expect(() => authSessionFromEmail('@test.local')).toThrow();
  });
});
