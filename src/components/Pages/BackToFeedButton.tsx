import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackToFeedButton: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToFeed = () => {
    navigate('/feed');
  };

  return (
    <button onClick={handleBackToFeed}>
      피드로 돌아가기
    </button>
  );
};

export default BackToFeedButton;