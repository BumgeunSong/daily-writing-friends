import { redirect, ScrollRestoration, type LoaderFunctionArgs } from 'react-router-dom';
import { sentryCreateBrowserRouter } from './sentry';
import './index.css';
import { Toaster } from '@/shared/ui/sonner';

// Critical-path eager imports (always rendered on first paint or referenced
// by errorElement / RouterProvider — adding a dynamic-import round trip would
// pay zero bundle savings). See design.md Decision 3.
import LoginPage from '@/login/components/LoginPage';
import { AppWithTracking } from '@/shared/components/AppWithTracking';
import { RootRedirect } from '@/shared/components/auth/RootRedirect';
import { PrivateRoutes, PublicRoutes } from '@/shared/components/auth/RouteGuards';
import { BottomNavigatorLayout } from '@/shared/components/BottomNavigatorLayout';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { PermissionErrorBoundary } from '@/shared/components/PermissionErrorBoundary';
import StatusMessage from '@/shared/components/StatusMessage';
import { BottomTabHandlerProvider } from './shared/contexts/BottomTabHandlerContext';
import { NavigationProvider } from './shared/contexts/NavigationContext';

// Root layout component with router-dependent providers and tracking
function RootLayout() {
  return (
    <NavigationProvider debounceTime={500} topThreshold={30} ignoreSmallChanges={10}>
      <BottomTabHandlerProvider>
        <ScrollRestoration />
        <AppWithTracking />
        <Toaster position="bottom-center" offset="4.5rem" />
      </BottomTabHandlerProvider>
    </NavigationProvider>
  );
}

// --- Route Block 분리 ---

// Root redirect
const rootRedirectRoute = {
  index: true,
  element: <RootRedirect />,
};

// Catch-all redirect
const catchAllRedirectRoute = {
  path: '*',
  loader: () => redirect('/'),
};

// Public routes — LoginPage stays eager (most cold visits land here);
// everything else is co-lazy.
const publicRoutes = {
  path: '',
  element: <PublicRoutes />,
  children: [
    { path: 'login', element: <LoginPage /> },
    {
      path: 'signup',
      lazy: async () => {
        const { default: SignupPage } = await import('@/login/components/SignupPage');
        return { Component: SignupPage };
      },
    },
    {
      path: 'verify-email',
      lazy: async () => {
        const { default: VerifyEmailPage } = await import('@/login/components/VerifyEmailPage');
        return { Component: VerifyEmailPage };
      },
    },
    {
      path: 'forgot-password',
      lazy: async () => {
        const { default: ForgotPasswordPage } = await import('@/login/components/ForgotPasswordPage');
        return { Component: ForgotPasswordPage };
      },
    },
    {
      path: 'set-password',
      lazy: async () => {
        const { default: SetPasswordPage } = await import('@/login/components/SetPasswordPage');
        return { Component: SetPasswordPage };
      },
    },
    {
      path: 'join',
      lazy: async () => {
        const { default: JoinIntroPage } = await import('@/login/components/JoinIntroPage');
        return { Component: JoinIntroPage };
      },
    },
    {
      path: 'free-writing/tutorial',
      lazy: async () => {
        const { default: PostFreewritingTutorial } = await import(
          '@/post/components/PostFreewritingTutorial'
        );
        return { Component: PostFreewritingTutorial };
      },
    },
  ],
};

// Private routes with bottom navigation.
// `board/:boardId` and `board/:boardId/post/:postId` use the "true parallel" pattern
// (static loader + Component-only lazy) so RR fires the loader and the chunk fetch
// in parallel on route match — eliminates the waterfall on the hottest routes.
// See design.md Decision 2.
const privateRoutesWithNav = {
  path: '',
  element: <PrivateRoutes />,
  children: [
    {
      path: '',
      element: <BottomNavigatorLayout />,
      children: [
        {
          path: 'boards',
          lazy: async () => {
            const { default: RecentBoard } = await import('@/board/components/RecentBoard');
            return { Component: RecentBoard };
          },
        },
        {
          path: 'boards/list',
          loader: async () => {
            const { boardsLoader } = await import('@/board/hooks/useBoardsLoader');
            return boardsLoader();
          },
          lazy: async () => {
            const { default: BoardListPage } = await import('@/board/components/BoardListPage');
            return { Component: BoardListPage };
          },
        },
        {
          path: 'board/:boardId',
          loader: async (args: LoaderFunctionArgs) => {
            const { boardLoader } = await import('@/board/hooks/useBoardLoader');
            return boardLoader(args);
          },
          lazy: async () => {
            const { default: BoardPage } = await import('@/board/components/BoardPage');
            return { Component: BoardPage, errorElement: <PermissionErrorBoundary /> };
          },
        },
        {
          path: 'create/:boardId/completion',
          lazy: async () => {
            const { default: PostCompletionPage } = await import(
              '@/post/components/PostCompletionPage'
            );
            return { Component: PostCompletionPage };
          },
        },
        {
          path: 'board/:boardId/post/:postId',
          loader: async (args: LoaderFunctionArgs) => {
            const { postDetailLoader } = await import('@/post/hooks/usePostDetailLoader');
            return postDetailLoader(args);
          },
          lazy: async () => {
            const { default: PostDetailPage } = await import('@/post/components/PostDetailPage');
            return { Component: PostDetailPage, errorElement: <PermissionErrorBoundary /> };
          },
        },
        {
          path: 'notifications',
          lazy: async () => {
            const { default: NotificationsPage } = await import(
              '@/notification/components/NotificationsPage'
            );
            return { Component: NotificationsPage };
          },
        },
        {
          path: 'account/edit/:userId',
          lazy: async () => {
            const { default: EditAccountPage } = await import('@/user/components/EditAccountPage');
            return { Component: EditAccountPage };
          },
        },
        {
          path: 'stats',
          lazy: async () => {
            const { default: StatsPage } = await import('@/stats/components/StatsPage');
            return { Component: StatsPage };
          },
        },
        {
          path: 'user',
          lazy: async () => {
            const { default: UserPage } = await import('@/user/components/UserPage');
            return { Component: UserPage };
          },
        },
        {
          path: 'user/:userId',
          lazy: async () => {
            const { default: UserPage } = await import('@/user/components/UserPage');
            return { Component: UserPage };
          },
        },
        {
          path: 'user/settings',
          lazy: async () => {
            const { default: UserSettingPage } = await import('@/user/components/UserSettingPage');
            return { Component: UserSettingPage };
          },
        },
        {
          path: 'user/blocked-users',
          lazy: async () => {
            const { default: BlockedUsersPage } = await import(
              '@/user/components/BlockedUsersPage'
            );
            return { Component: BlockedUsersPage };
          },
        },
      ],
    },
  ],
};

// Private routes without bottom navigation.
// `board/:boardId/edit/:postId` shares postDetailLoader with the detail route,
// also using the true-parallel pattern.
const privateRoutesWithoutNav = {
  path: '',
  element: <PrivateRoutes />,
  children: [
    {
      path: 'board/:boardId/free-writing/intro',
      lazy: async () => {
        const { default: PostFreewritingIntro } = await import(
          '@/post/components/PostFreewritingIntro'
        );
        return { Component: PostFreewritingIntro };
      },
    },
    {
      path: 'create/:boardId/free-writing',
      lazy: async () => {
        const { default: PostFreewritingPage } = await import(
          '@/post/components/PostFreewritingPage'
        );
        return { Component: PostFreewritingPage };
      },
    },
    {
      path: 'create/:boardId',
      lazy: async () => {
        const [{ default: PostCreationPage }, { createPostAction }] = await Promise.all([
          import('@/post/components/PostCreationPage'),
          import('@/post/hooks/useCreatePostAction'),
        ]);
        return { Component: PostCreationPage, action: createPostAction };
      },
    },
    {
      path: 'board/:boardId/edit/:postId',
      loader: async (args: LoaderFunctionArgs) => {
        const { postDetailLoader } = await import('@/post/hooks/usePostDetailLoader');
        return postDetailLoader(args);
      },
      lazy: async () => {
        const { default: PostEditPage } = await import('@/post/components/PostEditPage');
        return { Component: PostEditPage, errorElement: <PermissionErrorBoundary /> };
      },
    },
    {
      path: 'join/form',
      lazy: async () => {
        const { JoinDispatcher } = await import('@/login/components/JoinDispatcher');
        return { Component: JoinDispatcher };
      },
    },
    {
      path: 'join/form/active-user',
      lazy: async () => {
        const { default: JoinFormPageForActiveUser } = await import(
          '@/login/components/JoinFormPageForActiveUser'
        );
        return { Component: JoinFormPageForActiveUser };
      },
    },
    {
      path: 'join/onboarding',
      lazy: async () => {
        const { default: OnboardingPage } = await import('@/login/components/OnboardingPage');
        return { Component: OnboardingPage };
      },
    },
    {
      path: 'join/complete',
      lazy: async () => {
        const { default: JoinCompletePage } = await import('@/login/components/JoinCompletePage');
        return { Component: JoinCompletePage };
      },
    },
    {
      path: 'settings/add-login-method',
      lazy: async () => {
        const { default: AddLoginMethodPage } = await import(
          '@/user/components/AddLoginMethodPage'
        );
        return { Component: AddLoginMethodPage };
      },
    },
    {
      path: 'settings/change-password',
      lazy: async () => {
        const { default: ChangePasswordPage } = await import(
          '@/user/components/ChangePasswordPage'
        );
        return { Component: ChangePasswordPage };
      },
    },
    {
      path: 'debug-info',
      lazy: async () => {
        const { DebugInfo } = await import('@/shared/components/DebugInfo');
        return { Component: DebugInfo };
      },
    },
  ],
};

// Dev-only routes (tree-shaken in production)
const devRoutes = import.meta.env.DEV ? {
  path: 'test',
  children: [
    {
      path: 'editor',
      lazy: async () => {
        const { default: EditorTestPage } = await import('@/test/EditorTestPage');
        return { Component: EditorTestPage };
      },
    },
  ],
} : null;

// --- Router 생성 ---

export const router = sentryCreateBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: (
      <ErrorBoundary
        fallback={
          <StatusMessage
            error
            errorMessage='페이지를 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요.'
          />
        }
      >
        <></>
      </ErrorBoundary>
    ),
    children: [
      rootRedirectRoute,
      publicRoutes,
      privateRoutesWithNav,
      privateRoutesWithoutNav,
      ...(devRoutes ? [devRoutes] : []),
      catchAllRedirectRoute,
    ],
  },
]);
