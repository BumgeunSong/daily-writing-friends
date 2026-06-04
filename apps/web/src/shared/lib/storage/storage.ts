/**
 * Single chokepoint for persistent key-value storage.
 *
 * Web implementation wraps `window.localStorage` with try/catch (private mode,
 * quota exceeded, disabled cookies all throw in some browsers).
 *
 * React Native port will provide an equivalent implementation backed by
 * AsyncStorage + an in-memory hydration cache, preserving the sync read API
 * by hydrating known keys at app start.
 */
export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

export const storage: KeyValueStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // private mode / quota exceeded — caller proceeds without persistence
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // disabled storage — best-effort
    }
  },
  clear() {
    try {
      window.localStorage.clear();
    } catch {
      // disabled storage — best-effort
    }
  },
};
