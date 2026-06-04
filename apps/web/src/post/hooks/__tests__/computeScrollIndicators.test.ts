import { describe, it, expect } from 'vitest';
import { computeScrollIndicators } from '../useScrollIndicators';

describe('computeScrollIndicators', () => {
  describe('container fits content (no overflow)', () => {
    it('both arrows hidden when content fits exactly', () => {
      expect(
        computeScrollIndicators({ scrollLeft: 0, scrollWidth: 500, clientWidth: 500 }),
      ).toEqual({ canScrollLeft: false, canScrollRight: false });
    });

    it('both arrows hidden when container is wider than content', () => {
      expect(
        computeScrollIndicators({ scrollLeft: 0, scrollWidth: 400, clientWidth: 500 }),
      ).toEqual({ canScrollLeft: false, canScrollRight: false });
    });
  });

  describe('at the start of a scrollable area', () => {
    it('hides left, shows right when scrollLeft is 0', () => {
      expect(
        computeScrollIndicators({ scrollLeft: 0, scrollWidth: 1000, clientWidth: 500 }),
      ).toEqual({ canScrollLeft: false, canScrollRight: true });
    });

    it('still hides left at the 1px tolerance (avoids flicker)', () => {
      expect(
        computeScrollIndicators({ scrollLeft: 1, scrollWidth: 1000, clientWidth: 500 }),
      ).toEqual({ canScrollLeft: false, canScrollRight: true });
    });

    it('shows left once scrollLeft exceeds 1px', () => {
      expect(
        computeScrollIndicators({ scrollLeft: 2, scrollWidth: 1000, clientWidth: 500 }),
      ).toEqual({ canScrollLeft: true, canScrollRight: true });
    });
  });

  describe('mid-scroll', () => {
    it('shows both arrows', () => {
      expect(
        computeScrollIndicators({ scrollLeft: 250, scrollWidth: 1000, clientWidth: 500 }),
      ).toEqual({ canScrollLeft: true, canScrollRight: true });
    });
  });

  describe('at the end of a scrollable area', () => {
    it('shows left, hides right when scrolled to the exact end', () => {
      // scrollLeft + clientWidth = scrollWidth → hide right
      expect(
        computeScrollIndicators({ scrollLeft: 500, scrollWidth: 1000, clientWidth: 500 }),
      ).toEqual({ canScrollLeft: true, canScrollRight: false });
    });

    it('hides right within the 1px tolerance at the end', () => {
      // scrollLeft + clientWidth = scrollWidth - 1 → NOT < scrollWidth - 1 → hide right
      expect(
        computeScrollIndicators({ scrollLeft: 499, scrollWidth: 1000, clientWidth: 500 }),
      ).toEqual({ canScrollLeft: true, canScrollRight: false });
    });

    it('still shows right when 2+ pixels from the end', () => {
      expect(
        computeScrollIndicators({ scrollLeft: 498, scrollWidth: 1000, clientWidth: 500 }),
      ).toEqual({ canScrollLeft: true, canScrollRight: true });
    });
  });
});
