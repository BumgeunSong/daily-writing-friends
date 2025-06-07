import { LoaderFunctionArgs } from 'react-router-dom';
import { fetchPost } from '@/post/utils/postUtils';
import { getCurrentUser } from '@/shared/utils/authUtils';

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
    
    const post = await fetchPost(boardId, postId);
    return { post, boardId, postId };
  } catch (error) {
    console.error('Failed to fetch post:', error);
    throw new Response('Post not found', { status: 404 });
  }
}