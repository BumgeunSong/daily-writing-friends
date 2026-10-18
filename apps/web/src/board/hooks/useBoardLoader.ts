import * as Sentry from '@sentry/react';
import type { LoaderFunctionArgs } from 'react-router-dom';
import {
  buildAccessDenialResponse,
  checkBoardAccess,
  isUnknownLoaderError,
} from '@/post/utils/postLoaderAccess';
import { queryClient } from '@/shared/lib/queryClient';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { fetchUser } from '@/user/external/user.api';
import { userQueryKey } from '@/user/utils/userQueryKeys';
import {
  buildMissingBoardIdResponse,
  buildSignedOutRedirect,
  isRedirectResponse,
  mapBoardLoaderError,
  rememberBoardReturnPath,
} from '../utils/boardLoaderAccess';

export async function boardLoader({ params }: LoaderFunctionArgs) {
  const { boardId } = params;
  if (!boardId) throw buildMissingBoardIdResponse();

  try {
    return await Sentry.startSpan(
      { name: 'boardLoader', op: 'route.loader', attributes: { boardId } },
      async () => {
        const user = await Sentry.startSpan({ name: 'getCurrentUser', op: 'auth' }, () =>
          getCurrentUser(),
        );
        // No session means no identity to check membership against; falling
        // through would render the board to an unverified visitor.
        if (!user) {
          rememberBoardReturnPath(boardId);
          throw buildSignedOutRedirect();
        }

        const userData = await Sentry.startSpan({ name: 'fetchUser', op: 'db.query' }, () =>
          queryClient.ensureQueryData({
            queryKey: userQueryKey(user.uid),
            queryFn: () => fetchUser(user.uid),
          }),
        );

        const denial = checkBoardAccess(userData, boardId);
        if (denial) throw buildAccessDenialResponse(denial);

        return { boardId };
      },
    );
  } catch (error) {
    if (isRedirectResponse(error)) throw error;

    if (isUnknownLoaderError(error)) {
      Sentry.captureException(error, { tags: { surface: 'boardLoader' } });
    }
    console.error('Failed to validate board access:', error);
    throw mapBoardLoaderError(error);
  }
}
