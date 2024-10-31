import React from 'react';
import { Navigate } from 'react-router-dom';

const RecentBoard: React.FC = () => {
  const boardId = localStorage.getItem('boardId');

  if (boardId) {
    return <Navigate to={`/board/${boardId}`} />;
  }

  return <Navigate to="/boards/list" />;
};

export default RecentBoard; 