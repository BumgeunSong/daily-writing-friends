import { useEffect, useState } from 'react';
import { useNavigation as useRouterNavigation } from 'react-router-dom';
import {
  NAV_PROGRESS_SHOW_DELAY_MS,
  shouldShowProgressBar,
  type RouterNavigationState,
} from '@/shared/utils/navigationProgress';

/**
 * Thin top bar shown during react-router navigation/submission.
 * Suppressed for the first 150ms so warm-cache navigations don't flash the bar.
 * Decision logic lives in @/shared/utils/navigationProgress.
 */
export function NavigationProgressBar() {
  const { state } = useRouterNavigation() as { state: RouterNavigationState };
  const [hasDelayElapsed, setHasDelayElapsed] = useState(false);

  useEffect(() => {
    if (state === 'idle') {
      setHasDelayElapsed(false);
      return;
    }
    const timer = setTimeout(() => setHasDelayElapsed(true), NAV_PROGRESS_SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state]);

  if (!shouldShowProgressBar(state, hasDelayElapsed)) return null;

  return (
    <div
      role='progressbar'
      aria-busy='true'
      aria-label='페이지 이동 중'
      className='pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-transparent'
    >
      <div className='h-full w-1/3 animate-nav-progress bg-primary' />
    </div>
  );
}
