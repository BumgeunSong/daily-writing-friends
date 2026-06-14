import { useNavigate } from 'react-router-dom';
import { markBackNavigation, markForwardNavigation } from './navigationLifecycle';

/**
 * Navigate with a directional hierarchical page transition.
 *
 * `forward` pairs with React Router's viewTransition flag for new PUSH
 * navigations; `back` relies on the browser wrapping the POP for the
 * navigation that originated with viewTransition. Side effects (direction
 * attribute, scroll-suppression window) are owned by `navigationLifecycle`.
 */
export function useViewTransitionNavigate() {
  const navigate = useNavigate();
  return {
    forward: (to: string) => {
      markForwardNavigation();
      navigate(to, { viewTransition: true });
    },
    back: () => {
      markBackNavigation();
      navigate(-1);
    },
  };
}
