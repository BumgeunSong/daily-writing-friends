import React from 'react';
import { useNavigate } from 'react-router-dom';

const WritePostButton: React.FC = () => {
  const navigate = useNavigate();

  const handleWritePost = () => {
    navigate('/create'); // 글쓰기 페이지로 이동
  };

  return (
    <button 
      onClick={handleWritePost} 
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        padding: '10px 20px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      글쓰기
    </button>
  );
};

export default WritePostButton;