import { Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { BottomNavigatorLayout } from './components/common/BottomNavigatorLayout';
import EditAccountPage from './components/pages/account/EditAccountPage';
import LegacyAccountPage from './components/pages/account/LegacyAccountPage';
import BoardListPage from './components/pages/board/BoardListPage';
import BoardPage from './components/pages/board/BoardPage';
import RecentBoard from './components/pages/board/RecentBoard';
import JoinFormPageForActiveUser from './components/pages/join/form/JoinFormPageForActiveUser';
import JoinFormPageForNewUser from './components/pages/join/form/JoinFormPageForNewUser';
import ProtectedJoinFormPage, { JoinFormPageForActiveOrNewUser } from './components/pages/join/form/ProtectedJoinFormPage';
import JoinIntroPage from './components/pages/join/intro/JoinIntroPage';
import LoginPage from './components/pages/login/LoginPage';
import NotificationSettingPage from './components/pages/notification/NotificationSettingPage';
import NotificationsPage from './components/pages/notification/NotificationsPage';
import PostCreationPage from './components/pages/post/PostCreationPage';
import PostDetailPage from './components/pages/post/PostDetailPage';
import PostEditPage from './components/pages/post/PostEditPage';
import PostFreewritingIntro from './components/pages/post/PostFreewritingIntro';
import PostFreewritingPage from './components/pages/post/PostFreewritingPage';
import StatsPage from './components/pages/stats/StatsPage';
import UserPage from './components/pages/user/UserPage';
import { useAuth } from './contexts/AuthContext';
import PostCompletionPage from './components/pages/post/PostCompletionPage';
import { PrivateRoutes } from './components/route/PrivateRoutes';
import { PublicRoutes } from './components/route/PublicRoutes';

export default function App() {
  const { currentUser } = useAuth();

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
        <Route path="/board/:boardId" element={<BoardPage />} />
        <Route path="/create/:boardId" element={<PostCreationPage />} />
        <Route path="/create/:boardId/completion" element={<PostCompletionPage />} />
        <Route path="/board/:boardId/post/:postId" element={<PostDetailPage />} />
        <Route path="/board/:boardId/edit/:postId" element={<PostEditPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/notifications/settings" element={<NotificationSettingPage />} />
        <Route path="/account" element={<LegacyAccountPage />} />
        <Route path="/account/edit" element={<EditAccountPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/user/:userId" element={<UserPage />} />
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
        <PrivateRoutes fallback="join" redirectAfterLogin="predefined" predefinedPath="/login">
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
