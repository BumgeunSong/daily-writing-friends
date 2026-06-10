import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTypingPresence } from '../useTypingPresence';

describe('useTypingPresence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays typing through continuous pings shorter than idleDelay', () => {
    const { result } = renderHook(() => useTypingPresence({ idleDelay: 2000 }));

    for (let i = 0; i < 30; i++) {
      act(() => {
        result.current.ping();
        vi.advanceTimersByTime(100);
      });
    }

    expect(result.current.isTyping).toBe(true);
  });

  it('goes idle after idleDelay passes with no ping', () => {
    const { result } = renderHook(() => useTypingPresence({ idleDelay: 2000 }));

    act(() => {
      result.current.ping();
    });
    expect(result.current.isTyping).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.isTyping).toBe(false);
  });

  it('resets the idle countdown on each ping', () => {
    const { result } = renderHook(() => useTypingPresence({ idleDelay: 2000 }));

    act(() => {
      result.current.ping();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isTyping).toBe(true);

    act(() => {
      result.current.ping();
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.isTyping).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isTyping).toBe(false);
  });

  it('clears the pending timeout on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useTypingPresence({ idleDelay: 2000 }),
    );

    act(() => {
      result.current.ping();
    });

    unmount();

    expect(() => {
      vi.advanceTimersByTime(5000);
    }).not.toThrow();
  });
});
