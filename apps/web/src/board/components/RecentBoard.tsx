import type React from 'react';
import { Navigate } from '@/shared/navigation';

import { resolveRecentBoardRedirect } from '@/board/utils/recentBoardCache';
import { SESSION_KEYS, STORAGE_KEYS, sessionStore, storage } from '@/shared/lib/storage';

const RecentBoard: React.FC = () => {
  const { to, clearStoredCache } = resolveRecentBoardRedirect(
    {
      viewingBoardId: sessionStore.get(SESSION_KEYS.VIEWING_BOARD_ID),
      storedCache: storage.get(STORAGE_KEYS.BOARD_ID),
    },
    new Date(),
  );

  if (clearStoredCache) storage.remove(STORAGE_KEYS.BOARD_ID);

  return <Navigate to={to} />;
};

export default RecentBoard;
