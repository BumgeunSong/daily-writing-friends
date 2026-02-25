import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getHourBasedSeed, seededRandom, shuffleArray } from './shuffleUtils';

describe('shuffleUtils', () => {
  describe('getHourBasedSeed', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate seed based on date and hour', () => {
      // January 15, 2025 at 14:30
      const testDate = new Date(2025, 0, 15, 14, 30, 0);
      vi.setSystemTime(testDate);

      const seed = getHourBasedSeed();

      // Expected: 2025 * 10000 + 1 * 100 + 15 + 14 = 20250100 + 15 + 14 = 20250129
      expect(seed).toBe(20250129);
    });

    it('should return different seeds for different hours', () => {
      const date1 = new Date(2025, 0, 15, 10, 0, 0);
      const date2 = new Date(2025, 0, 15, 11, 0, 0);

      vi.setSystemTime(date1);
      const seed1 = getHourBasedSeed();

      vi.setSystemTime(date2);
      const seed2 = getHourBasedSeed();

      expect(seed1).not.toBe(seed2);
    });

    it('should return same seed for same hour on same day', () => {
      const date1 = new Date(2025, 0, 15, 14, 0, 0);
      const date2 = new Date(2025, 0, 15, 14, 59, 59);

      vi.setSystemTime(date1);
      const seed1 = getHourBasedSeed();

      vi.setSystemTime(date2);
      const seed2 = getHourBasedSeed();

      expect(seed1).toBe(seed2);
    });

    it('should return different seeds for different days', () => {
      const date1 = new Date(2025, 0, 15, 14, 0, 0);
      const date2 = new Date(2025, 0, 16, 14, 0, 0);

      vi.setSystemTime(date1);
      const seed1 = getHourBasedSeed();

      vi.setSystemTime(date2);
      const seed2 = getHourBasedSeed();

      expect(seed1).not.toBe(seed2);
    });

    it('should return different seeds for different months', () => {
      const date1 = new Date(2025, 0, 15, 14, 0, 0);
      const date2 = new Date(2025, 1, 15, 14, 0, 0);

      vi.setSystemTime(date1);
      const seed1 = getHourBasedSeed();

      vi.setSystemTime(date2);
      const seed2 = getHourBasedSeed();

      expect(seed1).not.toBe(seed2);
    });
  });

  describe('seededRandom', () => {
    it('should return a number between 0 and 1', () => {
      for (let seed = 0; seed < 100; seed++) {
        const result = seededRandom(seed);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(1);
      }
    });

    it('should return same value for same seed', () => {
      const result1 = seededRandom(12345);
      const result2 = seededRandom(12345);
      expect(result1).toBe(result2);
    });

    it('should return different values for different seeds', () => {
      const result1 = seededRandom(12345);
      const result2 = seededRandom(12346);
      expect(result1).not.toBe(result2);
    });

    it('should produce pseudo-random distribution', () => {
      // Generate many random numbers and check they are distributed
      const results = [];
      for (let seed = 0; seed < 1000; seed++) {
        results.push(seededRandom(seed));
      }

      // Check that we have a reasonable distribution
      const lessThanHalf = results.filter((r) => r < 0.5).length;
      const moreThanHalf = results.filter((r) => r >= 0.5).length;

      // Should be roughly balanced (allowing for some variance)
      expect(lessThanHalf).toBeGreaterThan(300);
      expect(moreThanHalf).toBeGreaterThan(300);
    });
  });

  describe('shuffleArray', () => {
    it('should return array of same length', () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffleArray(input, 12345);
      expect(result).toHaveLength(input.length);
    });

    it('should contain all original elements', () => {
      const input = [1, 2, 3, 4, 5];
      const result = shuffleArray(input, 12345);
      expect(result.sort((a, b) => a - b)).toEqual(input.sort((a, b) => a - b));
    });

    it('should not modify original array', () => {
      const input = [1, 2, 3, 4, 5];
      const originalCopy = [...input];
      shuffleArray(input, 12345);
      expect(input).toEqual(originalCopy);
    });

    it('should produce same shuffle for same seed', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result1 = shuffleArray(input, 12345);
      const result2 = shuffleArray(input, 12345);
      expect(result1).toEqual(result2);
    });

    it('should produce different shuffle for different seeds', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result1 = shuffleArray(input, 12345);
      const result2 = shuffleArray(input, 54321);
      expect(result1).not.toEqual(result2);
    });

    it('should handle empty array', () => {
      const result = shuffleArray([], 12345);
      expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
      const result = shuffleArray([42], 12345);
      expect(result).toEqual([42]);
    });

    it('should handle two element array', () => {
      const input = [1, 2];
      const result = shuffleArray(input, 12345);
      expect(result).toHaveLength(2);
      expect(result).toContain(1);
      expect(result).toContain(2);
    });

    it('should work with string arrays', () => {
      const input = ['a', 'b', 'c', 'd', 'e'];
      const result = shuffleArray(input, 12345);
      expect(result).toHaveLength(5);
      expect(result.sort((a, b) => a.localeCompare(b))).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('should work with object arrays', () => {
      const input = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const result = shuffleArray(input, 12345);
      expect(result).toHaveLength(3);
      expect(result.map((o) => o.id).sort((a, b) => a - b)).toEqual([1, 2, 3]);
    });

    it('should actually shuffle elements (not return original order)', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      // Try multiple seeds to find at least one that shuffles
      let foundShuffled = false;
      for (let seed = 0; seed < 100; seed++) {
        const result = shuffleArray(input, seed);
        if (!result.every((v, i) => v === input[i])) {
          foundShuffled = true;
          break;
        }
      }
      expect(foundShuffled).toBe(true);
    });
  });
});
