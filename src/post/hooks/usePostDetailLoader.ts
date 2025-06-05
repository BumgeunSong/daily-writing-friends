import { LoaderFunctionArgs } from 'react-router-dom';
import { fetchPost } from '@/post/utils/postUtils';

export async function postDetailLoader({ params }: LoaderFunctionArgs) {
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