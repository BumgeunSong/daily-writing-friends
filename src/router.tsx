import { createBrowserRouter, redirect, LoaderFunctionArgs, ActionFunctionArgs, Outlet } from 'react-router-dom';
import './index.css';

// Providers that need router context
import { BottomTabHandlerProvider } from './shared/contexts/BottomTabHandlerContext';
import { NavigationProvider } from './shared/contexts/NavigationContext';

// Layouts
import { BottomNavigatorLayout } from '@/shared/components/BottomNavigatorLayout';
import { PrivateRoutes } from './shared/components/route/PrivateRoutes';
import { PublicRoutes } from './shared/components/route/PublicRoutes';

// Pages
import BoardListPage from '@/board/components/BoardListPage';
import RecentBoard from '@/board/components/RecentBoard';
import BoardPageWithGuard from '@/board/components/BoardPageWithGuard';
import TopicCardCarouselPage from './board/components/TopicCardCarouselPage';
import PostCreationPage from '@/post/components/PostCreationPage';
import PostCompletionPage from '@/post/components/PostCompletionPage';
import PostDetailPageWithGuard from '@/post/components/PostDetailPageWithGuard';
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

// API functions that will be used in loaders
import { fetchBoardsWithUserPermissions } from '@/board/utils/boardUtils';
import { fetchPost } from '@/post/utils/postUtils';
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

// Loader functions
export async function boardsLoader() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw redirect('/login');
  }
  
  try {
    const boards = await fetchBoardsWithUserPermissions(currentUser.uid);
    return { boards: boards.sort((a, b) => (a.cohort || 0) - (b.cohort || 0)) };
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    throw new Response('Failed to load boards', { status: 500 });
  }
}

export async function postDetailLoader({ params }: LoaderFunctionArgs) {
  const { boardId, postId } = params;
  
  if (!boardId || !postId) {
    throw new Response('Missing required parameters', { status: 400 });
  }

  try {
    const post = await fetchPost(boardId, postId);
    return { post, boardId, postId };
  } catch (error) {
    console.error('Failed to fetch post:', error);
    throw new Response('Post not found', { status: 404 });
  }
}

// Action functions for mutations
export async function createPostAction({ request, params }: ActionFunctionArgs) {
  const { boardId } = params;
  const formData = await request.formData();
  
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const authorId = formData.get('authorId') as string;
  const authorName = formData.get('authorName') as string;
  const draftId = formData.get('draftId') as string | null;

  if (!title?.trim() || !content?.trim() || !boardId || !authorId) {
    return {
      error: '필수 정보가 누락되었습니다.'
    };
  }

  try {
    // Import the actual functions
    const { createPost } = await import('@/post/utils/postUtils');
    const { deleteDraft } = await import('@/draft/utils/draftUtils');
    const { sendAnalyticsEvent, AnalyticsEvent } = await import('@/shared/utils/analyticsUtils');

    // Create the post
    await createPost(boardId, title, content, authorId, authorName);
    
    // Send analytics
    sendAnalyticsEvent(AnalyticsEvent.CREATE_POST, {
      boardId,
      title,
      userId: authorId,
      userName: authorName
    });

    // Delete draft if it exists
    if (draftId) {
      await deleteDraft(authorId, draftId);
    }

    // React Router automatically revalidates all loaders after actions!
    // No manual cache invalidation needed!
    return redirect(`/create/${boardId}/completion`);
  } catch (error) {
    console.error('게시물 작성 중 오류가 발생했습니다:', error);
    return {
      error: '게시물 작성 중 오류가 발생했습니다. 다시 시도해주세요.'
    };
  }
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
            element: <BoardListPage />,
            loader: boardsLoader,
          },
          {
            path: 'board/:boardId',
            element: <BoardPageWithGuard />,
            loader: requireAuth,
          },
          {
            path: 'create/:boardId',
            element: <PostCreationPage />,
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
            element: <PostDetailPageWithGuard />,
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