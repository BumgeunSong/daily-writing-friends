import * as Sentry from '@sentry/react';
import type { LoaderFunctionArgs } from 'react-router-dom';
import { SupabaseNetworkError } from '@/shared/api/supabaseClient';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { fetchUser } from '@/user/api/user';

export async function boardLoader({ params }: LoaderFunctionArgs) {
  const { boardId } = params;

  if (!boardId) {
    throw new Response('Missing board ID', { status: 400 });
  }

  try {
    return await Sentry.startSpan(
      { name: 'boardLoader', op: 'route.loader', attributes: { boardId } },
      async () => {
        // Get current user
        const user = await Sentry.startSpan({ name: 'getCurrentUser', op: 'auth' }, () =>
          getCurrentUser(),
        );

        if (!user) {
          // Route guard (PrivateRoutes) will redirect to /login
          return { boardId };
        }

        // Check board permissions before allowing access
        const userData = await Sentry.startSpan({ name: 'fetchUser', op: 'db.query' }, () =>
          fetchUser(user.uid),
        );
        if (!userData) {
          throw new Response('User data not found', { status: 403 });
        }

        const userPermission = userData.boardPermissions?.[boardId];
        if (userPermission !== 'read' && userPermission !== 'write') {
          throw new Response('Access denied - insufficient board permissions', { status: 403 });
        }

        return { boardId };
      },
    );
  } catch (error) {
    console.error('Failed to validate board access:', error);

    if (error instanceof Response) {
      throw error; // Re-throw Response errors (permission/auth errors)
    }
    if (error instanceof SupabaseNetworkError) {
      throw new Response('네트워크 연결을 확인하고 다시 시도해주세요.', { status: 503 });
    }
    throw new Response('Board access validation failed', { status: 500 });
  }
}
