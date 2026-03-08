import { describe, it, expect } from 'vitest';
import { calculateCommentTemperature } from './commentTemperature';

describe('calculateCommentTemperature', () => {
  it('returns 0 for zero comments', () => {
    expect(calculateCommentTemperature(0)).toBe(0.0);
  });

  it('returns 36.5 for 1-10 comments', () => {
    expect(calculateCommentTemperature(1)).toBe(36.5);
    expect(calculateCommentTemperature(5)).toBe(36.5);
    expect(calculateCommentTemperature(10)).toBe(36.5);
  });

  it('adds 0.5 per 10-comment block after the first', () => {
    expect(calculateCommentTemperature(11)).toBe(37.0);
    expect(calculateCommentTemperature(20)).toBe(37.0);
    expect(calculateCommentTemperature(21)).toBe(37.5);
    expect(calculateCommentTemperature(30)).toBe(37.5);
  });

  it('caps at 100.0', () => {
    expect(calculateCommentTemperature(10000)).toBe(100.0);
  });

  it('rounds to 1 decimal place', () => {
    const result = calculateCommentTemperature(15);
    expect(result.toString()).toMatch(/^\d+\.?\d?$/);
  });
});
