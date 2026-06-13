import type { LoaderFunctionArgs } from 'react-router-dom';
import {
  buildAccessDenialResponse,
  checkBoardAccess,
  mapPostLoaderError,
} from '@/post/utils/postLoaderAccess';
import { postQueryKey, userQueryKey } from '@/post/utils/postQueryKeys';
import { fetchPost } from '@/post/utils/postUtils';
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

    const userData = await queryClient.ensureQueryData({
      queryKey: userQueryKey(user.uid),
      queryFn: () => fetchUser(user.uid),
    });

    const denial = checkBoardAccess(userData, boardId);
    if (denial) throw buildAccessDenialResponse(denial);

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
    throw mapPostLoaderError(error);
  }
}
