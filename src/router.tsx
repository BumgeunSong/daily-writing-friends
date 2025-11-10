import { createBrowserRouter, redirect, Outlet } from 'react-router-dom';
import './index.css';

// Providers that need router context

// Layouts

// Pages
import BoardListPage from '@/board/components/BoardListPage';
import BoardPage from '@/board/components/BoardPage';
import RecentBoard from '@/board/components/RecentBoard';
import NotificationsPage from '@/notification/components/NotificationsPage';
import StatsPage from '@/stats/components/StatsPage';
import UserPage from '@/user/components/UserPage';
import UserSettingPage from '@/user/components/UserSettingPage';
import EditAccountPage from '@/user/components/EditAccountPage';
import BlockedUsersPage from '@/user/components/BlockedUsersPage';
import { JoinFormPageForActiveOrNewUser } from '@/login/components/JoinFormPageForActiveOrNewUser';
import JoinFormPageForActiveUser from '@/login/components/JoinFormPageForActiveUser';
import JoinFormPageForNewUser from '@/login/components/JoinFormPageForNewUser';
import JoinIntroPage from '@/login/components/JoinIntroPage';
import LoginPage from '@/login/components/LoginPage';
import { DebugInfo } from '@/shared/components/DebugInfo';

// Loaders and actions from feature hooks
import { boardsLoader } from '@/board/hooks/useBoardsLoader';
import { boardLoader } from '@/board/hooks/useBoardLoader';
import PostCompletionPage from '@/post/components/PostCompletionPage';
import PostCreationPage from '@/post/components/PostCreationPage';
import PostDetailPage from '@/post/components/PostDetailPage';
import PostEditPage from '@/post/components/PostEditPage';
import PostFreewritingIntro from '@/post/components/PostFreewritingIntro';
import PostFreewritingPage from '@/post/components/PostFreewritingPage';
import { createPostAction } from '@/post/hooks/useCreatePostAction';
import { postDetailLoader } from '@/post/hooks/usePostDetailLoader';

// Auth guards and components
import { RootRedirect } from '@/shared/components/auth/RootRedirect';
import { PrivateRoutes, PublicRoutes } from '@/shared/components/auth/RouteGuards';
import { BottomNavigatorLayout } from '@/shared/components/BottomNavigatorLayout';

// Error boundary
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { PermissionErrorBoundary } from '@/shared/components/PermissionErrorBoundary';
import StatusMessage from '@/shared/components/StatusMessage';
import { AppWithTracking } from '@/shared/components/AppWithTracking';
import TopicCardCarouselPage from './board/components/TopicCardCarouselPage';
import { BottomTabHandlerProvider } from './shared/contexts/BottomTabHandlerContext';
import { NavigationProvider } from './shared/contexts/NavigationContext';

// Root layout component with router-dependent providers and tracking
function RootLayout({ children }: { children?: React.ReactNode }) {
  return (
    <NavigationProvider debounceTime={500} topThreshold={30} ignoreSmallChanges={10}>
      <BottomTabHandlerProvider>
        <AppWithTracking />
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

// Public routes
const publicRoutes = {
  path: '',
  element: <PublicRoutes />,
  children: [
    { path: 'login', element: <LoginPage /> },
    { path: 'join', element: <JoinIntroPage /> },
  ],
};

// Private routes with bottom navigation
const privateRoutesWithNav = {
  path: '',
  element: <PrivateRoutes />,
  children: [
    {
      path: '',
      element: <BottomNavigatorLayout />,
      children: [
        { path: 'boards', element: <RecentBoard /> },
        { path: 'boards/list', element: <BoardListPage />, loader: boardsLoader },
        {
          path: 'board/:boardId',
          element: <BoardPage />,
          loader: boardLoader,
          errorElement: <PermissionErrorBoundary />,
        },

        { path: 'create/:boardId/completion', element: <PostCompletionPage /> },
        { path: 'board/:boardId/topic-cards', element: <TopicCardCarouselPage /> },
        {
          path: 'board/:boardId/post/:postId',
          element: <PostDetailPage />,
          loader: postDetailLoader,
          errorElement: <PermissionErrorBoundary />,
        },

        { path: 'notifications', element: <NotificationsPage /> },
        { path: 'account/edit/:userId', element: <EditAccountPage /> },
        { path: 'stats', element: <StatsPage /> },
        { path: 'user', element: <UserPage /> },
        { path: 'user/:userId', element: <UserPage /> },
        { path: 'user/settings', element: <UserSettingPage /> },
        { path: 'user/blocked-users', element: <BlockedUsersPage /> },
      ],
    },
  ],
};

// Private routes without bottom navigation
const privateRoutesWithoutNav = {
  path: '',
  element: <PrivateRoutes />,
  children: [
    { path: 'board/:boardId/free-writing/intro', element: <PostFreewritingIntro /> },
    { path: 'create/:boardId/free-writing', element: <PostFreewritingPage /> },
    { path: 'create/:boardId', element: <PostCreationPage />, action: createPostAction },
    {
      path: 'board/:boardId/edit/:postId',
      element: <PostEditPage />,
      loader: postDetailLoader,
      errorElement: <PermissionErrorBoundary />,
    },
    { path: 'join/form', element: <JoinFormPageForActiveOrNewUser /> },
    { path: 'join/form/new-user', element: <JoinFormPageForNewUser /> },
    { path: 'join/form/active-user', element: <JoinFormPageForActiveUser /> },
    { path: 'debug-info', element: <DebugInfo /> },
  ],
};

// --- Router 생성 ---

export const router = createBrowserRouter([
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
      catchAllRedirectRoute,
    ],
  },
]);
