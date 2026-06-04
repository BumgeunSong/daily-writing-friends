import type React from 'react';
import { Navigate } from 'react-router-dom';

import { STORAGE_KEYS, storage } from '@/shared/lib/storage';

const RecentBoard: React.FC = () => {
  const boardId = storage.get(STORAGE_KEYS.BOARD_ID);


  if (boardId) {
    return <Navigate to={`/board/${boardId}`} />;
  }

  return <Navigate to='/boards/list' />;
};

export default RecentBoard;
