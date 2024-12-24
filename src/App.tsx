import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import './index.css';
import { ProtectedRoute } from './components/route/ProtectedRoute';
import { Toaster } from './components/ui/toaster';
import { lazy, Suspense } from 'react';
import BottomTabsNavigator from './components/pages/BottomTabsNavigator';

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

// Add loading fallback
function LoadingFallback() {
  return <div>Loading...</div>;
}

const AuthenticatedLayout = () => {
  return (
    <div className='flex min-h-screen flex-col pb-16 safe-top safe-right safe-bottom safe-left'>
      <div className='grow'>
        <Outlet />
      </div>
      <Toaster />
      <BottomTabsNavigator />
    </div>
  );
};

export default function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path='/login' element={
          <Suspense fallback={<LoadingFallback />}>
            {!currentUser ? <LoginPage /> : <Navigate to='/boards' />}
          </Suspense>
        }  />
      <Route
        element={
          <ProtectedRoute>
            <AuthenticatedLayout />
          </ProtectedRoute>
        }
      >
        <Route path='/boards' element={
          <Suspense fallback={<LoadingFallback />}>
            <RecentBoard />
          </Suspense>
        } />
        <Route path='/boards/list' element={<BoardListPage />} />
        <Route path='/board/:boardId' element={
          <Suspense fallback={<LoadingFallback />}>
            <BoardPage />
          </Suspense>
        } />
        <Route path='/create/:boardId' element={
          <Suspense fallback={<LoadingFallback />}>
            <PostCreationPage />
          </Suspense>
        } />
        <Route path='/board/:boardId/post/:postId' element={
          <Suspense fallback={<LoadingFallback />}>
            <PostDetailPage />
          </Suspense>
        } />
        <Route path='/board/:boardId/edit/:postId' element={
          <Suspense fallback={<LoadingFallback />}>
            <PostEditPage />
          </Suspense>
        } />
        <Route path='/notifications' element={
          <Suspense fallback={<LoadingFallback />}>
            <NotificationsPage />
          </Suspense>
        } />
        <Route path='/notifications/settings' element={
          <Suspense fallback={<LoadingFallback />}>
            <NotificationSettingPage />
          </Suspense>
        } />
        <Route path='/account' element={
          <Suspense fallback={<LoadingFallback />}>
            <AccountPage />
          </Suspense>
        } />
        <Route path='/account/edit' element={
          <Suspense fallback={<LoadingFallback />}>
            <EditAccountPage />
          </Suspense>
        } />
      </Route>
      <Route path='/' element={<Navigate to='/boards' />} />
      <Route path='*' element={<Navigate to='/' />} />
    </Routes>
  );
}
