// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/Pages/LoginPage';
import FeedPage from './components/Pages/BoardPage';
import PostCreationPage from './components/Pages/PostCreationPage';
import PostDetailPage from './components/Pages/PostDetailPage';
import EditPostPage from './components/Pages/EditPostPage';
import BoardListPage from './components/Pages/BoardListPage';
import BoardPage from './components/Pages/BoardPage';

import './index.css';

const App: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div>
      <Routes>
        <Route
          path="/login"
          element={!currentUser ? <LoginPage /> : <Navigate to="/boards" />}
        />
        <Route
          path="/boards"
          element={currentUser ? <BoardListPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/board/:boardId"
          element={currentUser ? <BoardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/create/:boardId"
          element={<PostCreationPage />}
        />
        <Route
          path="/board/:boardId/post/:id"
          element={currentUser ? <PostDetailPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/board/:boardId/edit/:id"
          element={currentUser ? <EditPostPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={<Navigate to="/boards" />}
        />
        <Route
          path="*"
          element={<Navigate to="/" />}
        />
      </Routes>
    </div>
  );
};

export default App;
