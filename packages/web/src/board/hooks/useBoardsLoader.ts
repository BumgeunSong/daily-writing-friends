import { fetchBoardsWithUserPermissions } from '@/board/utils/boardUtils';
import { getCurrentUser } from '@/shared/utils/authUtils';

export async function boardsLoader() {
  // NOTE: Auth checking is handled by PrivateRoutes component
  // This loader only runs when user is already authenticated
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      // Return empty data instead of throwing, let route guard handle auth
      return { boards: [] };
    }
    
    const boards = await fetchBoardsWithUserPermissions(currentUser.uid);
    return { boards: boards.sort((a, b) => (a.cohort || 0) - (b.cohort || 0)) };
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    throw new Response('Failed to load boards', { status: 500 });
  }
}