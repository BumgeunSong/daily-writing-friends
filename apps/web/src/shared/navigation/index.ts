/**
 * Single chokepoint for page-level routing primitives. The RN port replaces
 * this module with expo-router shims of the same shape — call sites unchanged.
 *
 * Router infrastructure (RouterProvider, loaders, Outlet, etc.) intentionally
 * stays imported directly from react-router-dom; it's web-specific glue the
 * RN app rewrites entirely.
 */
export {
  useParams,
  useNavigate,
  useLocation,
  useSearchParams,
  Link,
  Navigate,
} from 'react-router-dom';

export type {
  LinkProps,
  NavigateProps,
  Params,
  NavigateFunction,
  NavigateOptions,
} from 'react-router-dom';
