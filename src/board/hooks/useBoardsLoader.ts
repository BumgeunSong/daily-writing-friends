import { fetchBoardsWithUserPermissions } from '@/board/utils/boardUtils';
import { getCurrentUser } from '@/shared/utils/authUtils';

export async function boardsLoader() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    throw new Response('로그인 후 이용해주세요.', { status: 401 });
  }
  
  try {
    const boards = await fetchBoardsWithUserPermissions(currentUser.uid);
    return { boards: boards.sort((a, b) => (a.cohort || 0) - (b.cohort || 0)) };
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    throw new Response('Failed to load boards', { status: 500 });
  }
}