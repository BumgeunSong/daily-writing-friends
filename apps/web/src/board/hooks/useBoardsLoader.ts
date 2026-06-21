import { userBoardsQueryKey } from '@/board/utils/boardQueryKeys';
import { fetchBoardsWithUserPermissions } from '@/board/utils/boardUtils';
import { queryClient } from '@/shared/lib/queryClient';
import { getCurrentUser } from '@/shared/utils/authUtils';

export async function boardsLoader() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { boards: [] };

    const boards = await queryClient.ensureQueryData({
      queryKey: userBoardsQueryKey(currentUser.uid),
      queryFn: () => fetchBoardsWithUserPermissions(currentUser.uid),
    });
    return { boards };
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    throw new Response('Failed to load boards', { status: 500 });
  }
}
