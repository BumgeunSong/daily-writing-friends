import { describe, it, expect } from 'vitest';
import { formatDate } from './dateFormat';

describe('formatDate', () => {
  it('should return dateFolder in YYYYMMDD format', () => {
    const date = new Date(2025, 0, 15); // January 15, 2025
    const result = formatDate(date);
    expect(result.dateFolder).toBe('20250115');
  });

  it('should return timePrefix in HHMMSS format', () => {
    const date = new Date(2025, 0, 15, 14, 30, 45);
    const result = formatDate(date);
    expect(result.timePrefix).toBe('143045');
  });

  it('should pad single digit months with zero', () => {
    const date = new Date(2025, 4, 8); // May 8
    const result = formatDate(date);
    expect(result.dateFolder).toBe('20250508');
  });

  it('should pad single digit days with zero', () => {
    const date = new Date(2025, 11, 5); // December 5
    const result = formatDate(date);
    expect(result.dateFolder).toBe('20251205');
  });

  it('should pad single digit hours with zero', () => {
    const date = new Date(2025, 0, 15, 9, 30, 45);
    const result = formatDate(date);
    expect(result.timePrefix).toBe('093045');
  });

  it('should pad single digit minutes with zero', () => {
    const date = new Date(2025, 0, 15, 14, 5, 45);
    const result = formatDate(date);
    expect(result.timePrefix).toBe('140545');
  });

  it('should pad single digit seconds with zero', () => {
    const date = new Date(2025, 0, 15, 14, 30, 5);
    const result = formatDate(date);
    expect(result.timePrefix).toBe('143005');
  });

  it('should handle midnight correctly', () => {
    const date = new Date(2025, 0, 15, 0, 0, 0);
    const result = formatDate(date);
    expect(result.timePrefix).toBe('000000');
  });

  it('should handle end of day correctly', () => {
    const date = new Date(2025, 0, 15, 23, 59, 59);
    const result = formatDate(date);
    expect(result.timePrefix).toBe('235959');
  });

  it('should return object with both properties', () => {
    const date = new Date(2025, 0, 15, 14, 30, 45);
    const result = formatDate(date);
    expect(result).toHaveProperty('dateFolder');
    expect(result).toHaveProperty('timePrefix');
  });
});
