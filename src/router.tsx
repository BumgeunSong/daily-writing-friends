import { createBrowserRouter, redirect, Outlet } from 'react-router-dom';
import './index.css';

// Providers that need router context
import { BottomTabHandlerProvider } from './shared/contexts/BottomTabHandlerContext';
import { NavigationProvider } from './shared/contexts/NavigationContext';

// Layouts
import { BottomNavigatorLayout } from '@/shared/components/BottomNavigatorLayout';
import { PrivateRoutes } from './shared/components/route/PrivateRoutes';
import { PublicRoutes } from './shared/components/route/PublicRoutes';

// Pages
import BoardListPageMigrated from '@/board/components/BoardListPageMigrated';
import RecentBoard from '@/board/components/RecentBoard';
import BoardPageWithGuard from '@/board/components/BoardPageWithGuard';
import TopicCardCarouselPage from './board/components/TopicCardCarouselPage';
import PostCreationPageMigrated from '@/post/components/PostCreationPageMigrated';
import PostCompletionPage from '@/post/components/PostCompletionPage';
import PostDetailPageMigrated from '@/post/components/PostDetailPageMigrated';
import PostEditPage from '@/post/components/PostEditPage';
import PostFreewritingIntro from '@/post/components/PostFreewritingIntro';
import PostFreewritingPage from '@/post/components/PostFreewritingPage';
import NotificationsPage from '@/notification/components/NotificationsPage';
import NotificationSettingPage from '@/notification/components/NotificationSettingPage';
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

// Loaders and actions from feature hooks
import { boardsLoader } from '@/board/hooks/useBoardsLoader';
import { postDetailLoader } from '@/post/hooks/usePostDetailLoader';
import { createPostAction } from '@/post/hooks/useCreatePostAction';
import { auth } from '@/firebase';

// Error boundary
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import StatusMessage from '@/shared/components/StatusMessage';

// Root layout component with router-dependent providers
function RootLayout() {
  return (
    <NavigationProvider 
      debounceTime={500} 
      topThreshold={30} 
      ignoreSmallChanges={10}
    >
      <BottomTabHandlerProvider>
        <Outlet />
      </BottomTabHandlerProvider>
    </NavigationProvider>
  );
}

// Auth utility to get current user synchronously
function getCurrentUser() {
  return auth.currentUser;
}

// Auth utility functions
function requireAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw redirect('/login');
  }
  return currentUser;
}

function redirectIfAuthenticated() {
  const currentUser = getCurrentUser();
  if (currentUser) {
    throw redirect('/boards');
  }
  return null;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: (
      <ErrorBoundary fallback={<StatusMessage error errorMessage="페이지를 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요." />}>
        <></>
      </ErrorBoundary>
    ),
    children: [
      // Root redirect
      {
        index: true,
        loader: () => {
          const currentUser = getCurrentUser();
          return redirect(currentUser ? '/boards' : '/login');
        },
      },
      
      // Public routes
      {
        path: 'login',
        element: <LoginPage />,
        loader: redirectIfAuthenticated,
      },
      
      // Public post intro
      {
        path: 'board/:boardId/free-writing/intro',
        element: (
          <PublicRoutes>
            <PostFreewritingIntro />
          </PublicRoutes>
        ),
      },

      // Private routes with bottom navigation
      {
        path: '/',
        element: (
          <PrivateRoutes fallback="login" redirectAfterLogin="originalFromUser">
            <BottomNavigatorLayout />
          </PrivateRoutes>
        ),
        children: [
          {
            path: 'boards',
            element: <RecentBoard />,
            loader: requireAuth,
          },
          {
            path: 'boards/list',
            element: <BoardListPageMigrated />,
            loader: boardsLoader,
          },
          {
            path: 'board/:boardId',
            element: <BoardPageWithGuard />,
            loader: requireAuth,
          },
          {
            path: 'create/:boardId',
            element: <PostCreationPageMigrated />,
            loader: requireAuth,
            action: createPostAction,
          },
          {
            path: 'create/:boardId/completion',
            element: <PostCompletionPage />,
            loader: requireAuth,
          },
          {
            path: 'board/:boardId/topic-cards',
            element: <TopicCardCarouselPage />,
            loader: requireAuth,
          },
          {
            path: 'board/:boardId/post/:postId',
            element: <PostDetailPageMigrated />,
            loader: postDetailLoader,
          },
          {
            path: 'board/:boardId/edit/:postId',
            element: <PostEditPage />,
            loader: postDetailLoader,
          },
          {
            path: 'notifications',
            element: <NotificationsPage />,
            loader: requireAuth,
          },
          {
            path: 'notifications/settings',
            element: <NotificationSettingPage />,
            loader: requireAuth,
          },
          {
            path: 'account/edit/:userId',
            element: <EditAccountPage />,
            loader: requireAuth,
          },
          {
            path: 'stats',
            element: <StatsPage />,
            loader: requireAuth,
          },
          {
            path: 'user',
            element: <UserPage />,
            loader: requireAuth,
          },
          {
            path: 'user/:userId',
            element: <UserPage />,
            loader: requireAuth,
          },
          {
            path: 'user/settings',
            element: <UserSettingPage />,
            loader: requireAuth,
          },
          {
            path: 'user/blocked-users',
            element: <BlockedUsersPage />,
            loader: requireAuth,
          },
        ],
      },

      // Private routes without bottom navigation
      {
        path: 'create/:boardId/free-writing',
        element: (
          <PrivateRoutes fallback="login" redirectAfterLogin="predefined" predefinedPath="/boards">
            <PostFreewritingPage />
          </PrivateRoutes>
        ),
        loader: requireAuth,
      },

      // Join/onboarding routes
      {
        path: 'join',
        element: <JoinIntroPage />,
      },
      {
        path: 'join/form',
        element: (
          <PrivateRoutes fallback="join" redirectAfterLogin="originalFromUser">
            <JoinFormPageForActiveOrNewUser />
          </PrivateRoutes>
        ),
        loader: requireAuth,
      },
      {
        path: 'join/form/new-user',
        element: (
          <PrivateRoutes fallback="join" redirectAfterLogin="predefined" predefinedPath="/join/form/new-user">
            <JoinFormPageForNewUser />
          </PrivateRoutes>
        ),
        loader: requireAuth,
      },
      {
        path: 'join/form/active-user',
        element: (
          <PrivateRoutes fallback="join" redirectAfterLogin="predefined" predefinedPath="/join/form/active-user">
            <JoinFormPageForActiveUser />
          </PrivateRoutes>
        ),
        loader: requireAuth,
      },

      // Catch-all redirect
      {
        path: '*',
        loader: () => redirect('/'),
      },
    ],
  },
]);