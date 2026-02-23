import type { LoaderFunctionArgs } from 'react-router-dom';
import { fetchPost } from '@/post/utils/postUtils';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { fetchUser } from '@/user/api/user';

export async function postDetailLoader({ params }: LoaderFunctionArgs) {
  // NOTE: Auth checking is handled by PrivateRoutes component
  // This loader only runs when user is already authenticated
  const { boardId, postId } = params;
  
  if (!boardId || !postId) {
    throw new Response('Missing required parameters', { status: 400 });
  }

  try {
    // Wait for auth to be available, but don't fail if not authenticated
    // The route guard will handle redirects
    const user = await getCurrentUser();
    
    if (!user) {
      // Return empty data instead of throwing, let route guard handle auth
      return { post: null, boardId, postId };
    }
    
    // Check board permissions before fetching post
    const userData = await fetchUser(user.uid);
    if (!userData) {
      throw new Response('User data not found', { status: 403 });
    }
    
    const userPermission = userData.boardPermissions?.[boardId];
    if (userPermission !== 'read' && userPermission !== 'write') {
      throw new Response('Access denied - insufficient board permissions', { status: 403 });
    }
    
    const post = await fetchPost(boardId, postId);
    return { post, boardId, postId };
  } catch (error) {
    console.error('Failed to fetch post:', error);
    if (error instanceof Response) {
      throw error; // Re-throw Response errors (permission/auth errors)
    }
    throw new Response('Post not found', { status: 404 });
  }
}