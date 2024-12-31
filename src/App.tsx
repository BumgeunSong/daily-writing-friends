import { Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { ProtectedRoute } from './components/route/ProtectedRoute';
import { lazy } from 'react';
import { AfterLoginLayout } from './components/common/AfterLoginLayout';
import { LazyRoute } from './components/common/LazyRoute';
import { useAuth } from './contexts/AuthContext';
import StatsPage from './components/pages/stats/StatsPage';
const RecentBoard = lazy(() => import('./components/pages/board/RecentBoard'));
const LoginPage = lazy(() => import('./components/pages/login/LoginPage')); 
const BoardPage = lazy(() => import('./components/pages/board/BoardPage'));
const PostDetailPage = lazy(() => import('./components/pages/post/PostDetailPage'));
const AccountPage = lazy(() => import('./components/pages/account/AccountPage'));
const EditAccountPage = lazy(() => import('./components/pages/account/EditAccountPage'));
const NotificationsPage = lazy(() => import('./components/pages/notification/NotificationsPage'));
const NotificationSettingPage = lazy(() => import('./components/pages/notification/NotificationSettingPage'));
const PostCreationPage = lazy(() => import('./components/pages/post/PostCreationPage'));
const PostEditPage = lazy(() => import('./components/pages/post/PostEditPage'));
const BoardListPage = lazy(() => import('./components/pages/board/BoardListPage'));

export default function App() {
  const { currentUser } = useAuth();
  
  return (
    <Routes>
      <Route path='/login' element={
        !currentUser ? (
          <LazyRoute element={LoginPage} />
        ) : (
          <Navigate to='/boards' replace />
        )
      } />
      
      <Route element={
        <ProtectedRoute>
          <AfterLoginLayout />
        </ProtectedRoute>
      }>
        <Route path='/boards' element={<LazyRoute element={RecentBoard} />} />
        <Route path='/boards/list' element={<LazyRoute element={BoardListPage} />} />
        <Route path='/board/:boardId' element={<LazyRoute element={BoardPage} />} />
        <Route path='/create/:boardId' element={<LazyRoute element={PostCreationPage} />} />
        <Route path='/board/:boardId/post/:postId' element={<LazyRoute element={PostDetailPage} />} />
        <Route path='/board/:boardId/edit/:postId' element={<LazyRoute element={PostEditPage} />} />
        <Route path='/notifications' element={<LazyRoute element={NotificationsPage} />} />
        <Route path='/notifications/settings' element={<LazyRoute element={NotificationSettingPage} />} />
        <Route path='/account' element={<LazyRoute element={AccountPage} />} />
        <Route path='/account/edit' element={<LazyRoute element={EditAccountPage} />} />
        <Route path='/stats' element={<LazyRoute element={StatsPage} />} />
      </Route>

      <Route path='/' element={
        currentUser ? (
          <Navigate to='/boards' replace />
        ) : (
          <Navigate to='/login' replace />
        )
      } />
      
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}
