import React from 'react';
import { Navigate } from 'react-router-dom';

const RecentBoard: React.FC = () => {
  const boardId = localStorage.getItem('boardId');

  console.log("boardId", boardId)
  if (boardId) {
    return <Navigate to={`/board/${boardId}`} />;
  }

  console.log("/boards/list")
  return <Navigate to="/boards/list" />;
};

export default RecentBoard; 