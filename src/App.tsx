// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import FeedPage from './components/FeedPage';
import PostCreationPage from './components/PostCreationPage';
import PostDetailPage from './components/PostDetailPage';

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
          element={currentUser ? <PostCreationPage /> : <Navigate to="/login" />}
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
