import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
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
      <Switch>
        <Route exact path="/login">
          {!currentUser ? <LoginPage /> : <Redirect to="/feed" />}
        </Route>
        <PrivateRoute exact path="/feed" component={FeedPage} />
        <PrivateRoute exact path="/create" component={PostCreationPage} />
        <PrivateRoute exact path="/post/:id" component={PostDetailPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </>
  );
}

export default App;
