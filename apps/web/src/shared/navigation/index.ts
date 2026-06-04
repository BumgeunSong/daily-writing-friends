/**
 * Single chokepoint for page-level routing primitives.
 *
 * Web implementation re-exports from react-router-dom. The RN port will
 * replace this module's body with shims over expo-router (`useRouter`,
 * `useLocalSearchParams`, `Link`, `Redirect`) that preserve these exports'
 * shapes, so call sites need no changes during the port.
 *
 * Scope: only the hooks/components that have direct RN equivalents are
 * adapted here. Router infrastructure (RouterProvider, Routes, Route,
 * createBrowserRouter, loaders, actions, Form, ScrollRestoration,
 * useRouteError, isRouteErrorResponse, Outlet, useNavigation,
 * useActionData) stays imported directly from react-router-dom in the
 * router-setup layer — those are web-specific glue that the RN app rewrites
 * entirely.
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
