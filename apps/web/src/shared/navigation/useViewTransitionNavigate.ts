import { useNavigate } from 'react-router-dom';

type PageTransitionDirection = 'forward' | 'back';

// 트랜지션 지속(280ms)에 약간의 버퍼를 더한 값. 의도된 트랜지션이 끝난 뒤
// 속성을 지워, 의도하지 않은 popstate(iOS 가장자리 스와이프 등)가 잔여 방향을
// 활용해 두 번째 슬라이드를 그리지 않도록 한다.
const TRANSITION_DIRECTION_HOLD_MS = 320;

let resetToken = 0;

function setPageTransitionDirection(direction: PageTransitionDirection): void {
  document.documentElement.dataset.transition = direction;
  const myToken = ++resetToken;
  window.setTimeout(() => {
    if (resetToken === myToken) {
      delete document.documentElement.dataset.transition;
    }
  }, TRANSITION_DIRECTION_HOLD_MS);
}

/** Tags the next route change for the forward page-slide CSS in index.css. */
export function markPageTransitionForward(): void {
  setPageTransitionDirection('forward');
}

/** Tags the next route change for the back page-slide CSS in index.css. */
export function markPageTransitionBack(): void {
  setPageTransitionDirection('back');
}

/**
 * Navigate with a directional hierarchical page transition.
 *
 * `forward` pairs with React Router's viewTransition flag for new PUSH
 * navigations; `back` relies on the browser wrapping the POP for the
 * navigation that originated with viewTransition. The direction attribute
 * auto-clears after `TRANSITION_DIRECTION_HOLD_MS` so unintentional pops
 * (e.g. iOS edge swipe) fall through to the no-animation default.
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();
  return {
    forward: (to: string) => {
      markPageTransitionForward();
      navigate(to, { viewTransition: true });
    },
    back: () => {
      markPageTransitionBack();
      navigate(-1);
    },
  };
}
