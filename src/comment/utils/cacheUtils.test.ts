import { describe, it, expect } from 'vitest';
import {
  createCacheKey,
  createCacheEntry,
  isCacheValid,
  parseCacheEntry,
  serializeCacheEntry,
  type CacheEntry,
} from './cacheUtils';

describe('createCacheKey', () => {
  it('combines prefix and key with hyphen', () => {
    expect(createCacheKey('suggestions', 'user123')).toBe('suggestions-user123');
  });

  it('handles empty key', () => {
    expect(createCacheKey('prefix', '')).toBe('prefix-');
  });

  it('handles complex keys', () => {
    expect(createCacheKey('cache', 'user-123-post-456')).toBe('cache-user-123-post-456');
  });
});

describe('createCacheEntry', () => {
  it('creates entry with provided data, timestamp, and version', () => {
    const data = ['item1', 'item2'];
    const entry = createCacheEntry(data, 1000, 'v1');

    expect(entry).toEqual({
      data: ['item1', 'item2'],
      timestamp: 1000,
      version: 'v1',
    });
  });

  it('handles object data', () => {
    const data = { id: 1, name: 'test' };
    const entry = createCacheEntry(data, 2000, 'v2');

    expect(entry.data).toEqual({ id: 1, name: 'test' });
    expect(entry.timestamp).toBe(2000);
    expect(entry.version).toBe('v2');
  });
});

describe('isCacheValid', () => {
  const createTestEntry = (timestamp: number, version: string): CacheEntry<string[]> => ({
    data: [],
    timestamp,
    version,
  });

  describe('when version matches and within TTL', () => {
    it('returns true', () => {
      const entry = createTestEntry(1000, 'v1');
      expect(isCacheValid(entry, 2000, 5000, 'v1')).toBe(true);
    });
  });

  describe('when exactly at TTL boundary', () => {
    it('returns true', () => {
      const entry = createTestEntry(1000, 'v1');
      expect(isCacheValid(entry, 6000, 5000, 'v1')).toBe(true);
    });
  });

  describe('when TTL exceeded', () => {
    it('returns false', () => {
      const entry = createTestEntry(1000, 'v1');
      expect(isCacheValid(entry, 10000, 5000, 'v1')).toBe(false);
    });
  });

  describe('when version mismatches', () => {
    it('returns false even if within TTL', () => {
      const entry = createTestEntry(1000, 'v1');
      expect(isCacheValid(entry, 2000, 5000, 'v2')).toBe(false);
    });
  });

  describe('when both version mismatches and TTL exceeded', () => {
    it('returns false', () => {
      const entry = createTestEntry(1000, 'v1');
      expect(isCacheValid(entry, 10000, 5000, 'v2')).toBe(false);
    });
  });
});

describe('parseCacheEntry', () => {
  describe('when valid JSON', () => {
    it('parses cache entry correctly', () => {
      const json = JSON.stringify({ data: ['item'], timestamp: 1000, version: 'v1' });
      const result = parseCacheEntry<string[]>(json);

      expect(result).toEqual({
        data: ['item'],
        timestamp: 1000,
        version: 'v1',
      });
    });
  });

  describe('when null input', () => {
    it('returns undefined', () => {
      expect(parseCacheEntry(null)).toBeUndefined();
    });
  });

  describe('when invalid JSON', () => {
    it('returns undefined', () => {
      expect(parseCacheEntry('not valid json')).toBeUndefined();
    });
  });

  describe('when empty string', () => {
    it('returns undefined', () => {
      expect(parseCacheEntry('')).toBeUndefined();
    });
  });
});

describe('serializeCacheEntry', () => {
  it('serializes entry to JSON string', () => {
    const entry: CacheEntry<string[]> = {
      data: ['item1', 'item2'],
      timestamp: 1000,
      version: 'v1',
    };

    const result = serializeCacheEntry(entry);
    expect(JSON.parse(result)).toEqual(entry);
  });
});
