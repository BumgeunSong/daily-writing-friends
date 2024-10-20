// src/components/LoginPage.tsx
import React from 'react';
import { signInWithGoogle } from '../../firebase';
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"

const LoginPage: React.FC = () => {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md px-8 py-6 bg-white rounded-lg shadow-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-center text-gray-800">매일 글쓰기 프렌즈</h1>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600">구글 계정으로 로그인하여 시작하세요.</p>
        </CardContent>
        <CardFooter>
          <button
            onClick={handleLogin}
            className="w-full px-4 py-2 mt-4 text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            구글로 로그인하기
          </button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
