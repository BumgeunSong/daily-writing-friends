import { renderHook, act, waitFor } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { useRef } from 'react';
import { describe, it, expect, vi } from 'vitest';

/**
 * Hook to track the latest value in a ref for use in callbacks.
 * This avoids stale closure issues in intervals and event handlers.
 */
function useLatestValueRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * Hook to prevent concurrent execution of async operations.
 * If an operation is already in-flight, subsequent calls will wait for it to complete.
 */
function useConcurrentOperationGuard() {
  const currentOperationPromiseRef = useRef<Promise<unknown> | null>(null);

  const executeWithGuard = async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
    if (currentOperationPromiseRef.current !== null) {
      await currentOperationPromiseRef.current;
      return undefined;
    }

    const operationPromise = operation();
    currentOperationPromiseRef.current = operationPromise;

    try {
      return await operationPromise;
    } finally {
      currentOperationPromiseRef.current = null;
    }
  };

  return { executeWithGuard };
}

describe('useLatestValueRef', () => {
  describe('when value changes', () => {
    it('updates ref.current to the latest value', () => {
      const { result, rerender } = renderHook(({ value }) => useLatestValueRef(value), {
        initialProps: { value: 'initial' },
      });

      expect(result.current.current).toBe('initial');

      rerender({ value: 'updated' });

      expect(result.current.current).toBe('updated');
    });
  });

  describe('when used with objects', () => {
    it('tracks the latest object reference', () => {
      const initialObject = { count: 1 };
      const updatedObject = { count: 2 };

      const { result, rerender } = renderHook(({ value }) => useLatestValueRef(value), {
        initialProps: { value: initialObject },
      });

      expect(result.current.current).toBe(initialObject);

      rerender({ value: updatedObject });

      expect(result.current.current).toBe(updatedObject);
    });
  });

  describe('when ref is used in callback', () => {
    it('provides access to latest value without stale closure', () => {
      const { result, rerender } = renderHook(({ value }) => useLatestValueRef(value), {
        initialProps: { value: 0 },
      });

      const capturedRef = result.current;

      rerender({ value: 5 });
      rerender({ value: 10 });

      expect(capturedRef.current).toBe(10);
    });
  });
});

describe('useConcurrentOperationGuard', () => {
  describe('when no operation is in-flight', () => {
    it('executes the operation and returns its result', async () => {
      const { result } = renderHook(() => useConcurrentOperationGuard());

      const mockOperation = vi.fn().mockResolvedValue('success');

      let operationResult: string | undefined;
      await act(async () => {
        operationResult = await result.current.executeWithGuard(mockOperation);
      });

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(operationResult).toBe('success');
    });
  });

  describe('when operation is in-flight', () => {
    it('waits for the current operation and returns undefined without executing', async () => {
      const { result } = renderHook(() => useConcurrentOperationGuard());

      let resolveFirst: (value: string) => void;
      const firstOperationPromise = new Promise<string>((resolve) => {
        resolveFirst = resolve;
      });
      const firstOperation = vi.fn().mockReturnValue(firstOperationPromise);
      const secondOperation = vi.fn().mockResolvedValue('second');

      let firstResult: string | undefined;
      let secondResult: string | undefined;

      act(() => {
        result.current.executeWithGuard(firstOperation).then((r) => {
          firstResult = r;
        });
      });

      act(() => {
        result.current.executeWithGuard(secondOperation).then((r) => {
          secondResult = r;
        });
      });

      expect(secondOperation).not.toHaveBeenCalled();

      await act(async () => {
        resolveFirst!('first');
      });

      await waitFor(() => {
        expect(firstResult).toBe('first');
        expect(secondResult).toBe(undefined);
      });

      expect(secondOperation).not.toHaveBeenCalled();
    });
  });

  describe('when operation throws an error', () => {
    it('resets guard state and allows subsequent operations', async () => {
      const { result } = renderHook(() => useConcurrentOperationGuard());

      const error = new Error('Operation failed');
      const failingOperation = vi.fn().mockRejectedValue(error);

      await act(async () => {
        try {
          await result.current.executeWithGuard(failingOperation);
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      const successOperation = vi.fn().mockResolvedValue('recovered');
      let recoveredResult: string | undefined;

      await act(async () => {
        recoveredResult = await result.current.executeWithGuard(successOperation);
      });

      expect(successOperation).toHaveBeenCalledTimes(1);
      expect(recoveredResult).toBe('recovered');
    });
  });

  describe('when multiple concurrent calls are made', () => {
    it('only executes the first operation', async () => {
      const { result } = renderHook(() => useConcurrentOperationGuard());

      let resolveFirst: () => void;
      const firstPromise = new Promise<string>((resolve) => {
        resolveFirst = () => resolve('first');
      });

      const firstOp = vi.fn().mockReturnValue(firstPromise);
      const secondOp = vi.fn().mockResolvedValue('second');
      const thirdOp = vi.fn().mockResolvedValue('third');

      act(() => {
        result.current.executeWithGuard(firstOp);
        result.current.executeWithGuard(secondOp);
        result.current.executeWithGuard(thirdOp);
      });

      expect(firstOp).toHaveBeenCalledTimes(1);
      expect(secondOp).not.toHaveBeenCalled();
      expect(thirdOp).not.toHaveBeenCalled();

      await act(async () => {
        resolveFirst!();
      });
    });
  });
});
