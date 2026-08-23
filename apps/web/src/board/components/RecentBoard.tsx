import type React from 'react';
import { Navigate } from '@/shared/navigation';

import { resolveRecentBoardRedirect } from '@/board/utils/recentBoardCache';
import { STORAGE_KEYS, storage } from '@/shared/lib/storage';

const RecentBoard: React.FC = () => {
  const { to, clearCache } = resolveRecentBoardRedirect(
    storage.get(STORAGE_KEYS.BOARD_ID),
    new Date(),
  );

  if (clearCache) storage.remove(STORAGE_KEYS.BOARD_ID);

  return <Navigate to={to} />;
};

export default RecentBoard;
