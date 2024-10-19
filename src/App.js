import React from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import FeedPage from './components/FeedPage';
import PostCreationPage from './components/PostCreationPage';
import PostDetailPage from './components/PostDetailPage';

function App() {
  return (
    <Switch>
      <Route exact path="/login" component={LoginPage} />
      <PrivateRoute exact path="/feed" component={FeedPage} />
      <PrivateRoute exact path="/create" component={PostCreationPage} />
      <PrivateRoute exact path="/post/:id" component={PostDetailPage} />
      <Redirect to="/feed" />
    </Switch>
  );
}

export default App;
