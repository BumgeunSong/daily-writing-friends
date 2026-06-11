import { useEffect, type RefObject } from 'react';

/**
 * Calls `close` on `mousedown` whenever the click lands outside BOTH the
 * search input and the suggestions dropdown. Callers are expected to pass a
 * stable `close` (e.g. `useCallback`) so the effect doesn't re-bind on every
 * render.
 */
export function useCloseSuggestionsOnOutsideClick(
  searchInputRef: RefObject<HTMLElement | null>,
  suggestionsRef: RefObject<HTMLElement | null>,
  close: () => void,
): void {
  useEffect(() => {
    const handle = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideInput = searchInputRef.current?.contains(target);
      const insideDropdown = suggestionsRef.current?.contains(target);
      if (insideInput || insideDropdown) return;
      close();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [searchInputRef, suggestionsRef, close]);
}
