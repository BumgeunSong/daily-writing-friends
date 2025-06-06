import { redirect } from 'react-router-dom';
import { fetchBoardsWithUserPermissions } from '@/board/utils/boardUtils';
import { auth } from '@/firebase';

// Auth utility to get current user synchronously
function getCurrentUser() {
  return auth.currentUser;
}

export async function boardsLoader() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw redirect('/login');
  }
  
  try {
    const boards = await fetchBoardsWithUserPermissions(currentUser.uid);
    return { boards: boards.sort((a, b) => (a.cohort || 0) - (b.cohort || 0)) };
  } catch (error) {
    console.error('Failed to fetch boards:', error);
    throw new Response('Failed to load boards', { status: 500 });
  }
}