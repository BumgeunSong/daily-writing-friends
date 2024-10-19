import React from 'react';
import './App.css';
import { auth, firestore } from './firebase';

function App() {
  return (
    <div className="App">
      <h1>Artico</h1>
      <p>Firebase가 구성되었습니다!</p>
    </div>
  );
}

export default App;
