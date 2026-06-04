import { describe, it, expect } from 'vitest';
import { decideScrollDirection } from './useScrollDirection';

const DEFAULTS = {
  topThreshold: 10,
  ignoreSmallChanges: 5,
};

describe('decideScrollDirection', () => {
  describe('top-threshold branch', () => {
    it('reports up and resets the baseline when currentY is at the threshold', () => {
      expect(
        decideScrollDirection({ currentY: 10, lastY: 500, ...DEFAULTS }),
      ).toEqual({ direction: 'up', nextLastY: 10 });
    });

    it('reports up and resets the baseline when currentY is at zero', () => {
      expect(
        decideScrollDirection({ currentY: 0, lastY: 500, ...DEFAULTS }),
      ).toEqual({ direction: 'up', nextLastY: 0 });
    });

    it('overrides the small-delta branch when both apply (top wins)', () => {
      // currentY 5 is at top AND delta vs lastY=8 is only 3 (< ignoreSmallChanges)
      expect(
        decideScrollDirection({ currentY: 5, lastY: 8, ...DEFAULTS }),
      ).toEqual({ direction: 'up', nextLastY: 5 });
    });
  });

  describe('small-delta branch (iOS bounce)', () => {
    it('returns null direction and null nextLastY when delta is smaller than ignoreSmallChanges', () => {
      expect(
        decideScrollDirection({ currentY: 100, lastY: 102, ...DEFAULTS }),
      ).toEqual({ direction: null, nextLastY: null });
    });

    it('treats the boundary value as still small (strict <)', () => {
      // delta exactly equals ignoreSmallChanges → NOT small, falls through to direction
      expect(
        decideScrollDirection({ currentY: 105, lastY: 100, ...DEFAULTS }),
      ).toEqual({ direction: 'down', nextLastY: 105 });
    });

    it('treats one-less-than-boundary as small', () => {
      expect(
        decideScrollDirection({ currentY: 104, lastY: 100, ...DEFAULTS }),
      ).toEqual({ direction: null, nextLastY: null });
    });
  });

  describe('direction branch', () => {
    it('reports down when scrolling further from the top by more than ignoreSmallChanges', () => {
      expect(
        decideScrollDirection({ currentY: 500, lastY: 400, ...DEFAULTS }),
      ).toEqual({ direction: 'down', nextLastY: 500 });
    });

    it('reports up when scrolling back toward the top by more than ignoreSmallChanges', () => {
      expect(
        decideScrollDirection({ currentY: 400, lastY: 500, ...DEFAULTS }),
      ).toEqual({ direction: 'up', nextLastY: 400 });
    });

    it('treats currentY equal to lastY as a small delta (above threshold) and ignores it', () => {
      // With ignoreSmallChanges > 0, equality is always caught by the small-delta branch.
      expect(
        decideScrollDirection({ currentY: 500, lastY: 500, ...DEFAULTS }),
      ).toEqual({ direction: null, nextLastY: null });
    });
  });

  describe('option knobs', () => {
    it('honors a larger topThreshold', () => {
      expect(
        decideScrollDirection({ currentY: 50, lastY: 500, topThreshold: 100, ignoreSmallChanges: 5 }),
      ).toEqual({ direction: 'up', nextLastY: 50 });
    });

    it('honors a larger ignoreSmallChanges', () => {
      // delta = 20, ignoreSmallChanges = 50 → still ignored
      expect(
        decideScrollDirection({ currentY: 120, lastY: 100, topThreshold: 10, ignoreSmallChanges: 50 }),
      ).toEqual({ direction: null, nextLastY: null });
    });

    it('with ignoreSmallChanges = 0 every above-threshold sample produces a direction', () => {
      expect(
        decideScrollDirection({ currentY: 101, lastY: 100, topThreshold: 10, ignoreSmallChanges: 0 }),
      ).toEqual({ direction: 'down', nextLastY: 101 });
      expect(
        decideScrollDirection({ currentY: 99, lastY: 100, topThreshold: 10, ignoreSmallChanges: 0 }),
      ).toEqual({ direction: 'up', nextLastY: 99 });
    });

    it('with ignoreSmallChanges = 0, equal Y leaves direction null but updates baseline', () => {
      // The fall-through branch is only reachable when the small-delta branch is disabled.
      expect(
        decideScrollDirection({ currentY: 500, lastY: 500, topThreshold: 10, ignoreSmallChanges: 0 }),
      ).toEqual({ direction: null, nextLastY: 500 });
    });
  });
});
