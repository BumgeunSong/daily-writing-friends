import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

import AccountPage from './components/pages/account/AccountPage';
import EditAccountPage from './components/pages/account/EditAccountPage';
import BoardListPage from './components/pages/board/BoardListPage';
import BoardPage from './components/pages/board/BoardPage';
import RecentBoard from './components/pages/board/RecentBoard';
import BottomTabsNavigator from './components/pages/BottomTabsNavigator';
import LoginPage from './components/pages/login/LoginPage';
import NotificationsPage from './components/pages/notification/NotificationsPage';
import EditPostPage from './components/pages/post/EditPostPage';
import PostCreationPage from './components/pages/post/PostCreationPage';
import PostDetailPage from './components/pages/post/PostDetailPage';
import { useAuth } from './contexts/AuthContext';
import './index.css';

const AuthenticatedLayout = () => {
  return (
    <div className='flex min-h-screen flex-col pb-16'>
      <div className='grow'>
        <Outlet />
      </div>
      <BottomTabsNavigator />
    </div>
  );
};

export default function App() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      <Route path='/login' element={!currentUser ? <LoginPage /> : <Navigate to='/boards' />} />
      <Route element={currentUser ? <AuthenticatedLayout /> : <Navigate to='/login' />}>
        <Route path='/boards' element={<RecentBoard />} />
        <Route path='/boards/list' element={<BoardListPage />} />
        <Route path='/board/:boardId' element={<BoardPage />} />
        <Route path='/create/:boardId' element={<PostCreationPage />} />
        <Route path='/board/:boardId/post/:postId' element={<PostDetailPage />} />
        <Route path='/board/:boardId/edit/:postId' element={<EditPostPage />} />
        <Route path='/notifications' element={<NotificationsPage />} />
        <Route path='/account' element={<AccountPage />} />
        <Route path='/account/edit' element={<EditAccountPage />} />
      </Route>
      <Route path='/' element={<Navigate to='/boards' />} />
      <Route path='*' element={<Navigate to='/' />} />
    </Routes>
  );
}
