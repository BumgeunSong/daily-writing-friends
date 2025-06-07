import { fetchBoardsWithUserPermissions } from '@/board/utils/boardUtils';
import { requireAuthentication } from '@/shared/utils/authUtils';

export async function boardsLoader() {
  // Wait for Firebase auth state to be restored before checking authentication
  const currentUser = await requireAuthentication();
  
  try {
    const boards = await fetchBoardsWithUserPermissions(currentUser.uid);
    return { boards: boards.sort((a, b) => (a.cohort || 0) - (b.cohort || 0)) };
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    throw new Response('Failed to load boards', { status: 500 });
  }
}