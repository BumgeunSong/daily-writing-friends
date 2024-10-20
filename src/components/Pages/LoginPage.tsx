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
      <h1>Login</h1>
      <button onClick={handleLogin}>Sign in with Google</button>
    </div>
  );
};

export default LoginPage;
