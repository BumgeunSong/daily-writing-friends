import type React from 'react';
import { z } from 'zod';
import { Navigate } from '@/shared/navigation';

import { resolveRecentBoardRedirect } from '@/board/utils/recentBoardCache';
import { parseJson } from '@/shared/lib/parseJson';
import { SESSION_KEYS, STORAGE_KEYS, sessionStore, storage } from '@/shared/lib/storage';
import { parseStoredAuthUser } from '@/shared/utils/authUserParser';

const ViewingBoardSessionSchema = z.object({
  userId: z.string().uuid(),
  boardId: z.string().min(1),
});

function viewingBoardIdForCurrentUser(raw: string | null): string | null {
  const currentUser = parseStoredAuthUser(storage.get(STORAGE_KEYS.CURRENT_USER));
  if (!currentUser) return null;

  const viewingBoard = parseJson(raw, ViewingBoardSessionSchema);
  if (!viewingBoard) return null;

  return viewingBoard.userId === currentUser.uid ? viewingBoard.boardId : null;
}

const RecentBoard: React.FC = () => {
  const { to, clearStoredCache } = resolveRecentBoardRedirect(
    {
      viewingBoardId: viewingBoardIdForCurrentUser(sessionStore.get(SESSION_KEYS.VIEWING_BOARD_ID)),
      storedCache: storage.get(STORAGE_KEYS.BOARD_ID),
    },
    new Date(),
  );

  if (clearStoredCache) storage.remove(STORAGE_KEYS.BOARD_ID);

  return <Navigate to={to} />;
};

export default RecentBoard;
