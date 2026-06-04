/**
 * Single chokepoint for key-value storage so the RN port can swap one file.
 *
 * Web Storage can throw on every method (private mode, quota, disabled
 * cookies). Reads fall back to null; writes log a warning so quota bugs stay
 * visible to oncall and Sentry breadcrumbs.
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
    } catch (err) {
      console.warn('[storage] set failed', key, err);
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // best-effort
    }
  },
  clear() {
    try {
      window.localStorage.clear();
    } catch {
      // best-effort
    }
  },
};

export const sessionStore: KeyValueStorage = {
  get(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (err) {
      console.warn('[sessionStore] set failed', key, err);
    }
  },
  remove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // best-effort
    }
  },
  clear() {
    try {
      window.sessionStorage.clear();
    } catch {
      // best-effort
    }
  },
};
