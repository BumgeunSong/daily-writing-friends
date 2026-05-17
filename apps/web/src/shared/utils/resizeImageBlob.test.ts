import { describe, expect, it } from 'vitest';

import { computeCenterCrop } from './resizeImageBlob';

describe('computeCenterCrop', () => {
  describe('when source is landscape', () => {
    it('crops to a centered square for square destination', () => {
      expect(computeCenterCrop(1000, 500, 256, 256)).toEqual({
        sx: 250,
        sy: 0,
        sw: 500,
        sh: 500,
      });
    });
  });

  describe('when source is portrait', () => {
    it('crops to a centered square for square destination', () => {
      expect(computeCenterCrop(500, 1000, 256, 256)).toEqual({
        sx: 0,
        sy: 250,
        sw: 500,
        sh: 500,
      });
    });
  });

  describe('when source is already square', () => {
    it('returns the full source rectangle', () => {
      expect(computeCenterCrop(800, 800, 256, 256)).toEqual({
        sx: 0,
        sy: 0,
        sw: 800,
        sh: 800,
      });
    });
  });

  describe('when destination is wider than source aspect', () => {
    it('crops vertically to match destination aspect', () => {
      const crop = computeCenterCrop(1000, 1000, 1600, 900);
      expect(crop.sw).toBe(1000);
      expect(crop.sh).toBe(563);
      expect(crop.sx).toBe(0);
      expect(crop.sy).toBe(Math.round((1000 - crop.sh) / 2));
    });
  });
});
