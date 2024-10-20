import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';

const LogoutButton: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login'); // 로그아웃 후 로그인 페이지로 이동
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  return (
    <button onClick={handleLogout}>
      로그아웃
    </button>
  );
};

export default LogoutButton;