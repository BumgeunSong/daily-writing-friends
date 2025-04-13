import { Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { ProtectedRoute } from './components/route/ProtectedRoute';
import { BottomNavigatorLayout } from './components/common/BottomNavigatorLayout';
import { useAuth } from './contexts/AuthContext';
import StatsPage from './components/pages/stats/StatsPage';
import RecentBoard from './components/pages/board/RecentBoard';
import LoginPage from './components/pages/login/LoginPage';
import BoardPage from './components/pages/board/BoardPage';
import PostDetailPage from './components/pages/post/PostDetailPage';
import AccountPage from './components/pages/account/AccountPage';
import EditAccountPage from './components/pages/account/EditAccountPage';
import NotificationsPage from './components/pages/notification/NotificationsPage';
import NotificationSettingPage from './components/pages/notification/NotificationSettingPage';
import PostCreationPage from './components/pages/post/PostCreationPage';
import PostEditPage from './components/pages/post/PostEditPage';
import BoardListPage from './components/pages/board/BoardListPage';
import JoinIntroPage from './components/pages/join/intro/JoinIntroPage';
import ProtectedJoinFormPage from './components/pages/join/form/ProtectedJoinFormPage';
import JoinCompletePage from './components/pages/join/complete/JoinCompletePage';

export default function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path='/login' element={
        !currentUser ? (
          <LoginPage />
        ) : (
          <Navigate to='/boards' replace />
        )
      } />

      <Route element={
        <ProtectedRoute>
          <BottomNavigatorLayout />
        </ProtectedRoute>
      }>
        <Route path='/boards' element={<RecentBoard />} />
        <Route path='/boards/list' element={<BoardListPage />} />
        <Route path='/board/:boardId' element={<BoardPage />} />
        <Route path='/create/:boardId' element={<PostCreationPage />} />
        <Route path='/board/:boardId/post/:postId' element={<PostDetailPage />} />
        <Route path='/board/:boardId/edit/:postId' element={<PostEditPage />} />
        <Route path='/notifications' element={<NotificationsPage />} />
        <Route path='/notifications/settings' element={<NotificationSettingPage />} />
        <Route path='/account' element={<AccountPage />} />
        <Route path='/account/edit' element={<EditAccountPage />} />
        <Route path='/stats' element={<StatsPage />} />
      </Route>

      <Route path='/join/form' element={
          <ProtectedJoinFormPage />
      } />
      <Route path='/join/complete' element={
        <ProtectedRoute>
          <JoinCompletePage />
        </ProtectedRoute>
      } />

      <Route path='/' element={
        currentUser ? (
          <Navigate to='/boards' replace />
        ) : (
          <Navigate to='/login' replace />
        )
      } />

      <Route path='*' element={<Navigate to='/' replace />} />
      <Route path='/join' element={<JoinIntroPage />} />
    </Routes>
  );
}
