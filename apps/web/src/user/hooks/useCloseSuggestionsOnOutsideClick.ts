import { useEffect, type RefObject } from 'react';

/**
 * Calls `close` on `mousedown` whenever the click lands outside BOTH the
 * search input and the suggestions dropdown. Used by `BlockedUsersPage` to
 * dismiss its autocomplete when the user taps anywhere else on the page.
 *
 * The original component depended on `[]` so the handler captured the initial
 * `close`. Keeping the deps explicit here lets the caller swap in a `useCallback`-stable
 * close without surprises.
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
