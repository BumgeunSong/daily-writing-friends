import { useNavigate } from 'react-router-dom';

type PageTransitionDirection = 'forward' | 'back';

function setPageTransitionDirection(direction: PageTransitionDirection): void {
  document.documentElement.dataset.transition = direction;
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
 * navigation that originated with viewTransition.
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
