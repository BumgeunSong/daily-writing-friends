import { useState, useEffect } from 'react';

import type { ZodType } from 'zod';

import { sessionStore } from '@/shared/lib/storage';
import { parseJson, parseJsonUnknown } from '@/shared/lib/parseJson';

export function useSessionStorage<T>(
  key: string,
  defaultValue: T,
  schema?: ZodType<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (!key) return defaultValue;
    const saved = sessionStore.get(key);
    if (saved === null) return defaultValue;
    if (schema) return parseJson(saved, schema) ?? defaultValue;
    // Back-compat: callers without a schema get a best-effort parse (still no throw).
    return (parseJsonUnknown(saved) as T | undefined) ?? defaultValue;
  });

  useEffect(() => {
    if (!key) return;
    sessionStore.set(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
