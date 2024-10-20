// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/Pages/LoginPage';
import FeedPage from './components/Pages/FeedPage';
import PostCreationPage from './components/Pages/PostCreationPage';
import PostDetailPage from './components/Pages/PostDetailPage';

const App: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div>
      <Routes>
        <Route
          path="/login"
          element={!currentUser ? <LoginPage /> : <Navigate to="/feed" />}
        />
        <Route
          path="/feed"
          element={currentUser ? <FeedPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/create"
          element={<PostCreationPage />}
        />
        <Route
          path="/post/:id"
          element={currentUser ? <PostDetailPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={<Navigate to="/feed" />}
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
