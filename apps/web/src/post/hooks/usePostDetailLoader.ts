import * as Sentry from '@sentry/react';
import type { LoaderFunctionArgs } from 'react-router-dom';
import {
  buildAccessDenialResponse,
  checkBoardAccess,
  isUnknownLoaderError,
  mapPostLoaderError,
} from '@/post/utils/postLoaderAccess';
import { postQueryKey } from '@/post/utils/postQueryKeys';
import { fetchPost } from '@/post/utils/postUtils';
import { queryClient } from '@/shared/lib/queryClient';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { fetchUser } from '@/user/api/user';
import { userQueryKey } from '@/user/utils/userQueryKeys';

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
    return { post, boardId, postId };
  } catch (error) {
    // Unknown errors (TypeError, schema mismatch, etc.) default to a 404 via
    // mapPostLoaderError. Capture them so real bugs don't silently masquerade
    // as "Post not found". Intentional Response throws and network errors
    // already carry meaning — log them but don't escalate.
    if (isUnknownLoaderError(error)) {
      Sentry.captureException(error, { tags: { surface: 'postDetailLoader' } });
    }
    console.error('Failed to fetch post:', error);
    throw mapPostLoaderError(error);
  }
}
