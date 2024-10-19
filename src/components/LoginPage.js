import React from 'react';
import { signInWithGoogle } from '../firebase';

function LoginPage() {
  return (
    <div className="login-page">
      <h2>로그인 페이지</h2>
      <button onClick={signInWithGoogle}>Google로 로그인</button>
    </div>
  );
}

export default LoginPage;
