import { Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import BoardListPage from '@/board/components/BoardListPage';
import RecentBoard from '@/board/components/RecentBoard';
import { JoinFormPageForActiveOrNewUser } from '@/login/components/JoinFormPageForActiveOrNewUser';
import JoinFormPageForActiveUser from '@/login/components/JoinFormPageForActiveUser';
import JoinFormPageForNewUser from '@/login/components/JoinFormPageForNewUser';
import JoinIntroPage from '@/login/components/JoinIntroPage';
import LoginPage from '@/login/components/LoginPage';
import NotificationSettingPage from '@/notification/components/NotificationSettingPage';
import NotificationsPage from '@/notification/components/NotificationsPage';
import PostCompletionPage from '@/post/components/PostCompletionPage';
import PostCreationPage from '@/post/components/PostCreationPage';
import PostEditPage from '@/post/components/PostEditPage';
import PostFreewritingIntro from '@/post/components/PostFreewritingIntro';
import PostFreewritingPage from '@/post/components/PostFreewritingPage';
import { BottomNavigatorLayout } from '@/shared/components/BottomNavigatorLayout';
import StatsPage from '@/stats/components/StatsPage';
import EditAccountPage from '@/user/components/EditAccountPage';
import UserPage from '@/user/components/UserPage';
import UserSettingPage from '@/user/components/UserSettingPage';
import BlockedUsersPage from '@/user/components/BlockedUsersPage';
import { PrivateRoutes } from './shared/components/route/PrivateRoutes';
import { PublicRoutes } from './shared/components/route/PublicRoutes';
import BoardPageWithGuard from '@/board/components/BoardPageWithGuard';
import PostDetailPageWithGuard from '@/post/components/PostDetailPageWithGuard';
import TopicCardCarouselPage from './board/components/TopicCardCarouselPage';

export function AppRouter({ currentUser }: { currentUser: any | null }) {
    return (
      <Routes>
        {/* 인증/비인증 공통: 로그인/루트/404 */}
        <Route path="/login" element={
          !currentUser ? <LoginPage /> : <Navigate to="/boards" replace />
        } />
        <Route path="/" element={
          currentUser ? <Navigate to="/boards" replace /> : <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
  
        {/* 공개(누구나 접근) 라우트 */}
        <Route path="/board/:boardId/free-writing/intro" element={
          <PublicRoutes>
            <PostFreewritingIntro />
          </PublicRoutes>
        } />
  
        {/* 인증 필요, BottomNavigatorLayout 적용 */}
        <Route element={
          <PrivateRoutes fallback="login" redirectAfterLogin="originalFromUser">
            <BottomNavigatorLayout />
          </PrivateRoutes>
        }>
          <Route path="/boards" element={<RecentBoard />} />
          <Route path="/boards/list" element={<BoardListPage />} />
          <Route path="/board/:boardId" element={<BoardPageWithGuard />} />
          <Route path="/create/:boardId" element={<PostCreationPage />} />
          <Route path="/create/:boardId/completion" element={<PostCompletionPage />} />
          <Route path="/board/:boardId/topic-cards" element={<TopicCardCarouselPage />} />
          <Route path="/board/:boardId/post/:postId" element={<PostDetailPageWithGuard />} />
          <Route path="/board/:boardId/edit/:postId" element={<PostEditPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/notifications/settings" element={<NotificationSettingPage />} />
          <Route path="/account/edit/:userId" element={<EditAccountPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/user/:userId" element={<UserPage />} />
          <Route path="/user/settings" element={<UserSettingPage />} />
          <Route path="/user/blocked-users" element={<BlockedUsersPage />} />
        </Route>
  
        {/* 인증 필요, BottomNavigatorLayout 미적용 (개별 페이지) */}
        <Route path="/create/:boardId/free-writing" element={
          <PrivateRoutes fallback="login" redirectAfterLogin="predefined" predefinedPath="/boards">
            <PostFreewritingPage />
          </PrivateRoutes>
        } />
  
        {/* 회원가입/온보딩 관련 라우트 */}
        <Route path="/join" element={<JoinIntroPage />} />
        <Route path="/join/form" element={
          <PrivateRoutes fallback="join" redirectAfterLogin="originalFromUser">
            <JoinFormPageForActiveOrNewUser />
          </PrivateRoutes>
        } />
        <Route path="/join/form/new-user" element={
          <PrivateRoutes fallback="join" redirectAfterLogin="predefined" predefinedPath="/join/form/new-user">
            <JoinFormPageForNewUser />
          </PrivateRoutes>
        } />
        <Route path="/join/form/active-user" element={
          <PrivateRoutes fallback="join" redirectAfterLogin="predefined" predefinedPath="/join/form/active-user">
            <JoinFormPageForActiveUser />
          </PrivateRoutes>
        } />
      </Routes>
    );
  }