import { useState, useEffect } from 'react';

import { sessionStore } from '@/shared/lib/storage';

export function useSessionStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (!key) return defaultValue;
    const saved = sessionStore.get(key);
    if (saved === null) return defaultValue;
    try {
      return JSON.parse(saved) as T;
    } catch (err) {
      console.warn('[useSessionStorage] parse failed', key, err);
      return defaultValue;
    }
  });

  useEffect(() => {
    if (!key) return;
    sessionStore.set(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
