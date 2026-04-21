import { useState, useCallback } from 'react';
import { useInterval } from './useInterval';
import { WritingStatus } from '@/stats/model/WritingStatus';

interface UseCountupTimerOptions {
  targetTime: number;
  status: WritingStatus;
  onReach: () => void;
  reached: boolean;
}

interface UseCountupTimerReturn {
  elapsedTime: number;
}

export function useCountupTimer({
  targetTime,
  status,
  onReach,
  reached,
}: UseCountupTimerOptions): UseCountupTimerReturn {
  const [elapsedTime, setElapsedTime] = useState(0);

  const delay = status === WritingStatus.Writing ? 1000 : null;

  const tick = useCallback(() => {
    setElapsedTime((prevTime) => {
      const newTime = prevTime + 1;
      if (newTime >= targetTime && !reached) {
        onReach();
      }
      return newTime;
    });
  }, [targetTime, reached, onReach]);

  useInterval(tick, delay);

  return { elapsedTime };
}
