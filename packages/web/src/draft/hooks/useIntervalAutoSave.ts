import { useEffect, useRef } from 'react';

/**
 * 일정 주기마다 saveFn을 호출하는 interval 훅
 * @param shouldSave 저장 조건 (true일 때만 동작)
 * @param saveFn 저장 함수
 * @param interval 호출 간격(ms)
 */
export function useIntervalAutoSave(
  shouldSave: boolean,
  saveFn: () => void,
  interval: number
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!shouldSave) return;
    intervalRef.current = setInterval(() => {
      saveFn();
    }, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shouldSave, saveFn, interval]);
} 