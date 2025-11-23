import { useEffect, useRef } from 'react';

/**
 * 입력이 멈춘 뒤 일정 시간 후(saveFn) 호출하는 debounce 훅
 * @param shouldSave 저장 조건 (true일 때만 동작)
 * @param saveFn 저장 함수
 * @param delay debounce 대기 시간(ms)
 */
export function useDebouncedAutoSave(
  shouldSave: boolean,
  saveFn: () => void,
  delay: number
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!shouldSave) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveFn();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [shouldSave, saveFn, delay]);
} 