import { LoaderFunctionArgs } from 'react-router-dom';
import { fetchPosts } from '@/post/api/post';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { getBlockedByUsers } from '@/user/api/user';

export async function boardPostsLoader({ params }: LoaderFunctionArgs) {
  const { boardId } = params;
  
  if (!boardId) {
    throw new Response('Missing boardId parameter', { status: 400 });
  }

  // PrivateRoutes ensures user is authenticated before this runs
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Response('로그인 후 이용해주세요.', { status: 401 });
  }

  try {
    // Get blocked users first
    const blockedByUsers = await getBlockedByUsers(currentUser.uid);
    
    // Fetch initial posts (first page with 7 items)
    const initialPosts = await fetchPosts(boardId, 7, blockedByUsers);
    
    return { 
      boardId, 
      initialPosts,
      blockedByUsers 
    };
  } catch (error) {
    console.error('Failed to fetch board posts:', error);
    throw new Response('Failed to load posts', { status: 500 });
  }
}