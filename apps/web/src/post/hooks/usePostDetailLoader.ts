import type { LoaderFunctionArgs } from 'react-router-dom';
import { postQueryKey, userQueryKey } from '@/post/utils/postQueryKeys';
import { fetchPost } from '@/post/utils/postUtils';
import { SupabaseNetworkError } from '@/shared/api/supabaseClient';
import { queryClient } from '@/shared/lib/queryClient';
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
    const userData = await queryClient.ensureQueryData({
      queryKey: userQueryKey(user.uid),
      queryFn: () => fetchUser(user.uid),
    });
    if (!userData) {
      throw new Response('User data not found', { status: 403 });
    }

    const userPermission = userData.boardPermissions?.[boardId];
    if (userPermission !== 'read' && userPermission !== 'write') {
      throw new Response('Access denied - insufficient board permissions', { status: 403 });
    }

    const post = await queryClient.ensureQueryData({
      queryKey: postQueryKey(boardId, postId),
      queryFn: () => fetchPost(boardId, postId),
    });
    // Seed for cold path so PostDetailPage's useQuery sees the data on first render
    // (avoids loading flash). Redundant for warm path - ensureQueryData already populated it.
    queryClient.setQueryData(postQueryKey(boardId, postId), post);
    return { post, boardId, postId };
  } catch (error) {
    console.error('Failed to fetch post:', error);
    if (error instanceof Response) {
      throw error; // Re-throw Response errors (permission/auth errors)
    }
    if (error instanceof SupabaseNetworkError) {
      throw new Response('네트워크 연결을 확인하고 다시 시도해주세요.', { status: 503 });
    }
    throw new Response('Post not found', { status: 404 });
  }
}