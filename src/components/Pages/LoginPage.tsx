// src/components/LoginPage.tsx
import React from 'react';
import { signInWithGoogle } from '../../firebase';

const LoginPage: React.FC = () => {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
    <div>
      <h1>매일 글쓰기 프렌즈</h1>
      <button onClick={handleLogin}>구글로 로그인하기</button>
    </div>
  );
};

export default LoginPage;
