import React from 'react';
import './App.css';
import LoginPage from './components/LoginPage';
import { signOut } from './firebase';

function App() {
  return (
    <div className="App">
      <h1>Artico</h1>
      <p>Firebase가 구성되었습니다!</p>
      <LoginPage />
      <button onClick={signOut}>로그아웃</button>
    </div>
  );
}

export default App;
