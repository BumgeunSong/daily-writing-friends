import { describe, it, expect } from 'vitest';
import { shouldReloadForChunkFailure, CHUNK_RELOAD_LOOP_WINDOW_MS } from './chunkReloadDecision';

describe('shouldReloadForChunkFailure', () => {
  describe('when no prior reload has happened', () => {
    it('reloads to recover the fresh chunks', () => {
      expect(shouldReloadForChunkFailure(1_000, null)).toBe(true);
    });
  });

  describe('when a reload just happened', () => {
    it('does not reload again within the loop window', () => {
      const lastReloadAt = 1_000;
      const atWindowEdge = lastReloadAt + CHUNK_RELOAD_LOOP_WINDOW_MS;
      expect(shouldReloadForChunkFailure(atWindowEdge, lastReloadAt)).toBe(false);
    });
  });

  describe('when the last reload is older than the loop window', () => {
    it('reloads again for a later deploy in the same session', () => {
      const lastReloadAt = 1_000;
      const pastWindow = lastReloadAt + CHUNK_RELOAD_LOOP_WINDOW_MS + 1;
      expect(shouldReloadForChunkFailure(pastWindow, lastReloadAt)).toBe(true);
    });
  });
});
