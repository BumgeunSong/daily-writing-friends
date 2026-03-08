import { useState, useEffect } from 'react';

/**
 * sessionStorage를 사용하여 상태를 저장하고 복원하는 훅
 * @param key sessionStorage 키
 * @param defaultValue 기본값
 * @returns [value, setValue] 튜플
 */
export function useSessionStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (!key) return defaultValue;
    try {
      const saved = sessionStorage.getItem(key);
      if (saved === null) return defaultValue;
      return JSON.parse(saved) as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (!key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to sessionStorage:', error);
    }
  }, [key, value]);

  return [value, setValue];
}
