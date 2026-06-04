/**
 * Single chokepoint for key-value storage.
 *
 * `storage` is persistent across sessions; `sessionStore` is ephemeral (web:
 * tab-scoped, cleared on tab close). Both wrap the underlying Web Storage with
 * try/catch — private mode, quota exceeded, and disabled cookies all throw on
 * access.
 *
 * React Native port:
 *   - `storage` → AsyncStorage + hydration cache, preserving sync reads
 *   - `sessionStore` → app-scoped in-memory Map (semantics differ from web's
 *     tab-scoped sessionStorage; callers that rely on per-tab isolation need
 *     re-evaluation during the port)
 */
export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}

function makeWebKeyValueStorage(getBackend: () => Storage): KeyValueStorage {
  return {
    get(key) {
      try {
        return getBackend().getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        getBackend().setItem(key, value);
      } catch {
        // private mode / quota exceeded — caller proceeds without persistence
      }
    },
    remove(key) {
      try {
        getBackend().removeItem(key);
      } catch {
        // disabled storage — best-effort
      }
    },
    clear() {
      try {
        getBackend().clear();
      } catch {
        // disabled storage — best-effort
      }
    },
  };
}

// Lazy backend lookup: the Storage reference is resolved on every call so that
// test environments that swap window.localStorage with a mock (and any future
// runtime that rebinds these globals) see the up-to-date object.
export const storage: KeyValueStorage = makeWebKeyValueStorage(() => window.localStorage);
export const sessionStore: KeyValueStorage = makeWebKeyValueStorage(() => window.sessionStorage);
