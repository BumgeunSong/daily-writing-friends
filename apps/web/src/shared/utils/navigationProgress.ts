/**
 * Show-delay before painting the navigation progress bar.
 * Below this threshold, fast warm-cache navigations finish without flashing the bar.
 */
export const NAV_PROGRESS_SHOW_DELAY_MS = 150;

export type RouterNavigationState = 'idle' | 'loading' | 'submitting';

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
