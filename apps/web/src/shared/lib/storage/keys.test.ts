import { describe, it, expect } from 'vitest';
import { boardTitleKey, LEGACY_THEME_KEYS, STORAGE_KEYS } from './keys';

describe('boardTitleKey', () => {
  it('prefixes a board id with the boardTitle_ namespace', () => {
    expect(boardTitleKey('abc-123')).toBe('boardTitle_abc-123');
  });

  it('keeps the prefix even for an empty board id', () => {
    expect(boardTitleKey('')).toBe('boardTitle_');
  });
});

describe('STORAGE_KEYS', () => {
  it('exposes the auth user, board id, and theme keys as string literals', () => {
    expect(STORAGE_KEYS.CURRENT_USER).toBe('currentUser');
    expect(STORAGE_KEYS.BOARD_ID).toBe('boardId');
    expect(STORAGE_KEYS.THEME_PREFERENCE).toBe('theme-preference-v2');
  });
});

describe('LEGACY_THEME_KEYS', () => {
  it('lists the pre-v2 theme keys that should be cleaned up on read', () => {
    expect([...LEGACY_THEME_KEYS]).toEqual(['theme-preference', 'theme', 'color-scheme']);
  });
});
