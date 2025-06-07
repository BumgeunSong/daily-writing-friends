import { LoaderFunctionArgs } from 'react-router-dom';
import { fetchPosts } from '@/post/api/post';
import { getBlockedByUsers } from '@/user/api/user';
import { requireAuthentication } from '@/shared/utils/authUtils';

export async function boardPostsLoader({ params }: LoaderFunctionArgs) {
  const { boardId } = params;
  
  if (!boardId) {
    throw new Response('Missing boardId parameter', { status: 400 });
  }

  // RouterAuthGuard ensures auth is initialized before this runs
  const currentUser = requireAuthentication();

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