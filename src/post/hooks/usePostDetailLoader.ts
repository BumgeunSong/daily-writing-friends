import { LoaderFunctionArgs } from 'react-router-dom';
import { fetchPost } from '@/post/utils/postUtils';
import { getCurrentUser } from '@/shared/utils/authUtils';

export async function postDetailLoader({ params }: LoaderFunctionArgs) {
  // PrivateRoutes ensures user is authenticated before this runs
  getCurrentUser(); // Ensure we have a user (throws if not)
  
  const { boardId, postId } = params;
  
  if (!boardId || !postId) {
    throw new Response('Missing required parameters', { status: 400 });
  }

  try {
    const post = await fetchPost(boardId, postId);
    return { post, boardId, postId };
  } catch (error) {
    console.error('Failed to fetch post:', error);
    throw new Response('Post not found', { status: 404 });
  }
}