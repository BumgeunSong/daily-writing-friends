import * as Sentry from '@sentry/react';
import type { LoaderFunctionArgs } from 'react-router-dom';
import { fetchRecentPosts } from '@/post/api/post';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { getBlockedByUsers } from '@/user/api/user';

export async function boardPostsLoader({ params }: LoaderFunctionArgs) {
  const { boardId } = params;

  if (!boardId) {
    throw new Response('Missing boardId parameter', { status: 400 });
  }

  return await Sentry.startSpan({ name: 'boardPostsLoader', op: 'route.loader', attributes: { boardId } }, async () => {
  // PrivateRoutes ensures user is authenticated before this runs
  const currentUser = await Sentry.startSpan({ name: 'getCurrentUser', op: 'auth' }, () => getCurrentUser());

  if (!currentUser) {
    throw new Response('로그인 후 이용해주세요.', { status: 401 });
  }

  try {
    // Get blocked users first
    const blockedByUsers = await Sentry.startSpan({ name: 'getBlockedByUsers', op: 'db.query' }, () => getBlockedByUsers(currentUser.uid));

    // Fetch initial posts (first page with 7 items)
    const initialPosts = await Sentry.startSpan({ name: 'fetchRecentPosts', op: 'db.query', attributes: { boardId, limit: 7 } }, () => fetchRecentPosts(boardId, 7, blockedByUsers));

    return {
      boardId,
      initialPosts,
      blockedByUsers
    };
  } catch (error) {
    console.error('Failed to fetch board posts:', error);
    throw new Response('Failed to load posts', { status: 500 });
  }
  });
}