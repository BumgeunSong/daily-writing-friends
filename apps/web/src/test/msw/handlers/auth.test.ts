import { describe, expect, it } from 'vitest';
import { userIdFromEmail } from './auth';

describe('userIdFromEmail', () => {
  it('returns the local part of a standard email', () => {
    expect(userIdFromEmail('alice@test.local')).toBe('alice');
  });

  it('returns the input when no @ is present', () => {
    expect(userIdFromEmail('plain')).toBe('plain');
  });
});
