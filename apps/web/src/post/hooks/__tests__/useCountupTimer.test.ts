import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCountupTimer } from '../useCountupTimer';
import { WritingStatus } from '@/stats/model/WritingStatus';

describe('useCountupTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('increments elapsed time while writing', () => {
    const onReach = vi.fn();
    const { result } = renderHook(() =>
      useCountupTimer({
        targetTime: 300,
        status: WritingStatus.Writing,
        onReach,
        reached: false,
      })
    );

    expect(result.current.elapsedTime).toBe(0);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.elapsedTime).toBe(3);
  });

  it('pauses when status is Paused', () => {
    const onReach = vi.fn();
    const { result, rerender } = renderHook(
      ({ status }) =>
        useCountupTimer({
          targetTime: 300,
          status,
          onReach,
          reached: false,
        }),
      { initialProps: { status: WritingStatus.Writing } }
    );

    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.elapsedTime).toBe(3);

    rerender({ status: WritingStatus.Paused });

    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.elapsedTime).toBe(3);
  });

  it('calls onReach when target time is reached', () => {
    const onReach = vi.fn();
    renderHook(() =>
      useCountupTimer({
        targetTime: 3,
        status: WritingStatus.Writing,
        onReach,
        reached: false,
      })
    );

    act(() => { vi.advanceTimersByTime(2000); });
    expect(onReach).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(onReach).toHaveBeenCalledTimes(1);
  });

  it('does not call onReach again once reached is true', () => {
    const onReach = vi.fn();
    const { rerender } = renderHook(
      ({ reached }) =>
        useCountupTimer({
          targetTime: 3,
          status: WritingStatus.Writing,
          onReach,
          reached,
        }),
      { initialProps: { reached: false } }
    );

    act(() => { vi.advanceTimersByTime(3000); });
    expect(onReach).toHaveBeenCalledTimes(1);

    rerender({ reached: true });

    act(() => { vi.advanceTimersByTime(3000); });
    expect(onReach).toHaveBeenCalledTimes(1);
  });
});
