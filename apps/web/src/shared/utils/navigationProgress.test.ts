import { describe, it, expect } from 'vitest';
import { shouldShowProgressBar } from './navigationProgress';

describe('shouldShowProgressBar', () => {
  describe('when router is idle', () => {
    it('returns false regardless of elapsed delay', () => {
      expect(shouldShowProgressBar('idle', false)).toBe(false);
      expect(shouldShowProgressBar('idle', true)).toBe(false);
    });
  });

  describe('when router is loading', () => {
    it('returns false before show-delay elapsed (no flicker on fast navigations)', () => {
      expect(shouldShowProgressBar('loading', false)).toBe(false);
    });

    it('returns true after show-delay elapsed', () => {
      expect(shouldShowProgressBar('loading', true)).toBe(true);
    });
  });

  describe('when router is submitting', () => {
    it('returns false before show-delay elapsed', () => {
      expect(shouldShowProgressBar('submitting', false)).toBe(false);
    });

    it('returns true after show-delay elapsed', () => {
      expect(shouldShowProgressBar('submitting', true)).toBe(true);
    });
  });
});
