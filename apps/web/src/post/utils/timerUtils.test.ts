import { describe, it, expect } from 'vitest';
import { formatTime } from './timerUtils';

describe('formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats seconds only', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  it('formats exact minutes', () => {
    expect(formatTime(300)).toBe('05:00');
  });

  it('pads single digits', () => {
    expect(formatTime(61)).toBe('01:01');
  });
});
