import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useImageUpload } from '../useImageUpload';

// Mock all external dependencies
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('@/firebase', () => ({
  storage: {},
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/post/utils/ImageUtils', () => ({
  processImageForUpload: vi.fn(),
}));

describe('useImageUpload', () => {
  describe('callback stability', () => {
    it('imageHandler should be stable when insertImage callback is stable', () => {
      // This test catches the bug where unstable insertImage caused
      // imageHandler to be recreated on every render, breaking useMemo chains
      const stableInsertImage = vi.fn();

      const { result, rerender } = renderHook(() =>
        useImageUpload({ insertImage: stableInsertImage })
      );

      const firstHandler = result.current.imageHandler;
      rerender();
      const secondHandler = result.current.imageHandler;

      expect(firstHandler).toBe(secondHandler);
    });

    it('imageHandler should change when insertImage callback changes', () => {
      let insertImage = vi.fn();

      const { result, rerender } = renderHook(
        ({ insertImage }) => useImageUpload({ insertImage }),
        { initialProps: { insertImage } }
      );

      const firstHandler = result.current.imageHandler;

      // Simulate unstable callback (new function on each render)
      insertImage = vi.fn();
      rerender({ insertImage });
      const secondHandler = result.current.imageHandler;

      // This is expected - unstable callback causes handler to change
      expect(firstHandler).not.toBe(secondHandler);
    });
  });
});
