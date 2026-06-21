import type { useNavigation } from 'react-router-dom';

/**
 * Show-delay before painting the navigation progress bar.
 * Below this threshold, fast warm-cache navigations finish without flashing the bar.
 */
export const NAV_PROGRESS_SHOW_DELAY_MS = 150;

/**
 * Derived from react-router-dom's actual `useNavigation()` return type so this
 * union stays in lock-step with the library — if a future RR release adds a
 * state, TypeScript will surface it here rather than letting it drift silently.
 */
export type RouterNavigationState = ReturnType<typeof useNavigation>['state'];

/**
 * Decide whether the navigation progress bar should be visible.
 *
 * - Always hidden when router is idle.
 * - Visible only after the show-delay has elapsed, so brief navigations don't flicker.
 */
export function shouldShowProgressBar(
  state: RouterNavigationState,
  hasDelayElapsed: boolean,
): boolean {
  if (state === 'idle') return false;
  return hasDelayElapsed;
}
