import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoginPage from './components/pages/LoginPage'
import PostCreationPage from './components/pages/PostCreationPage'
import PostDetailPage from './components/pages/PostDetailPage'
import EditPostPage from './components/pages/EditPostPage'
import BoardListPage from './components/pages/BoardListPage'
import BoardPage from './components/pages/BoardPage'
import BottomTabsNavigator from './components/pages/BottomTabsNavigator'
import NotificationsPage from './components/pages/NotificationsPage'
import AccountPage from './components/pages/AccountPage'
import RecentBoard from './components/pages/RecentBoard'

import './index.css'
import EditAccountPage from './components/pages/EditAccountPage'

const AuthenticatedLayout = () => {
  return (
    <div className="flex flex-col min-h-screen pb-16">
      <div className="flex-grow">
        <Outlet />
      </div>
      <BottomTabsNavigator />
    </div>
  )
}

export default function App() {
  const { currentUser } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={!currentUser ? <LoginPage /> : <Navigate to="/boards" />}
      />
      <Route element={currentUser ? <AuthenticatedLayout /> : <Navigate to="/login" />}>
        <Route path="/boards" element={<RecentBoard />} />
        <Route path="/boards/list" element={<BoardListPage />} />
        <Route path="/board/:boardId" element={<BoardPage />} />
        <Route path="/create/:boardId" element={<PostCreationPage />} />
        <Route path="/board/:boardId/post/:id" element={<PostDetailPage />} />
        <Route path="/board/:boardId/edit/:id" element={<EditPostPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/edit" element={<EditAccountPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/boards" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}