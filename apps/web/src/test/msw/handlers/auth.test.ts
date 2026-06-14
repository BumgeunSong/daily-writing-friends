import { describe, expect, it } from 'vitest';
import { testEmailFor, userIdFromEmail } from './auth';

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
