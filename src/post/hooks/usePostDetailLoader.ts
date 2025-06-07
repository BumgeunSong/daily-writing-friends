import { LoaderFunctionArgs } from 'react-router-dom';
import { fetchPost } from '@/post/utils/postUtils';
import { getCurrentUser } from '@/shared/utils/authUtils';

export async function postDetailLoader({ params }: LoaderFunctionArgs) {
  // Wait for auth to initialize before proceeding
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Response('로그인 후 이용해주세요.', { status: 401 });
  }
  
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