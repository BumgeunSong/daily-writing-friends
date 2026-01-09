/**
 * Pure cache utility functions for comment suggestions
 * These functions have no side effects and are fully testable with output-based tests
 */

// Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

export interface CacheConfig {
  keyPrefix: string;
  ttl: number;
  version: string;
}

// Pure functions

/**
 * Creates a namespaced cache key
 */
export const createCacheKey = (prefix: string, key: string): string => `${prefix}-${key}`;

/**
 * Creates a cache entry with metadata
 * @param data - The data to cache
 * @param timestamp - Current timestamp (injected for testability)
 * @param version - Cache version for invalidation
 */
export const createCacheEntry = <T>(data: T, timestamp: number, version: string): CacheEntry<T> => ({
  data,
  timestamp,
  version,
});

/**
 * Validates a cache entry against TTL and version
 * @param entry - The cache entry to validate
 * @param currentTime - Current timestamp (injected for testability)
 * @param ttl - Time-to-live in milliseconds
 * @param expectedVersion - Expected cache version
 */
export const isCacheValid = <T>(
  entry: CacheEntry<T>,
  currentTime: number,
  ttl: number,
  expectedVersion: string
): boolean => {
  const isVersionMatch = entry.version === expectedVersion;
  const isWithinTtl = currentTime - entry.timestamp <= ttl;
  return isVersionMatch && isWithinTtl;
};

/**
 * Parses a JSON string into a CacheEntry, returns undefined if invalid
 */
export const parseCacheEntry = <T>(jsonString: string | null): CacheEntry<T> | undefined => {
  if (!jsonString) return undefined;
  try {
    return JSON.parse(jsonString) as CacheEntry<T>;
  } catch {
    return undefined;
  }
};

/**
 * Serializes a cache entry to JSON string
 */
export const serializeCacheEntry = <T>(entry: CacheEntry<T>): string => JSON.stringify(entry);
