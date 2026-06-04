import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sessionStore, storage } from './storage';

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('round-trip', () => {
    it('returns the value previously set under the same key', () => {
      storage.set('k', 'v');
      expect(storage.get('k')).toBe('v');
    });

    it('returns null for a key that was never set', () => {
      expect(storage.get('missing')).toBeNull();
    });

    it('returns null after a key is removed', () => {
      storage.set('k', 'v');
      storage.remove('k');
      expect(storage.get('k')).toBeNull();
    });

    it('drops every key on clear', () => {
      storage.set('a', '1');
      storage.set('b', '2');
      storage.clear();
      expect(storage.get('a')).toBeNull();
      expect(storage.get('b')).toBeNull();
    });
  });

  describe('when window.localStorage throws', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns null from get instead of throwing', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(storage.get('k')).toBeNull();
    });

    it('swallows set errors so the caller can proceed without persistence', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      expect(() => storage.set('k', 'v')).not.toThrow();
    });

    it('swallows remove errors', () => {
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(() => storage.remove('k')).not.toThrow();
    });

    it('swallows clear errors', () => {
      vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      expect(() => storage.clear()).not.toThrow();
    });
  });
});

describe('sessionStore', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  describe('round-trip', () => {
    it('returns the value previously set under the same key', () => {
      sessionStore.set('k', 'v');
      expect(sessionStore.get('k')).toBe('v');
    });

    it('returns null for a key that was never set', () => {
      expect(sessionStore.get('missing')).toBeNull();
    });

    it('returns null after a key is removed', () => {
      sessionStore.set('k', 'v');
      sessionStore.remove('k');
      expect(sessionStore.get('k')).toBeNull();
    });

    it('drops every key on clear', () => {
      sessionStore.set('a', '1');
      sessionStore.set('b', '2');
      sessionStore.clear();
      expect(sessionStore.get('a')).toBeNull();
      expect(sessionStore.get('b')).toBeNull();
    });
  });

  describe('isolation from storage', () => {
    beforeEach(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    it('does not leak keys between persistent and ephemeral stores', () => {
      storage.set('shared', 'persistent');
      sessionStore.set('shared', 'ephemeral');
      expect(storage.get('shared')).toBe('persistent');
      expect(sessionStore.get('shared')).toBe('ephemeral');
    });
  });
});
