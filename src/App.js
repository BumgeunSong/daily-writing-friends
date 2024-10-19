import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import FeedPage from './pages/FeedPage';
import PostCreationPage from './pages/PostCreationPage';
import PostDetailPage from './pages/PostDetailPage';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/Header';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const { currentUser } = useAuth();

  return (
    <>
      <Header />
      <Routes>
        <Route
          path="/login"
          element={!currentUser ? <LoginPage /> : <Navigate to="/feed" />}
        />
        <Route
          path="/feed"
          element={<PrivateRoute component={FeedPage} />}
        />
        <Route
          path="/create"
          element={<PrivateRoute component={PostCreationPage} />}
        />
        <Route
          path="/post/:id"
          element={<PrivateRoute component={PostDetailPage} />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;
