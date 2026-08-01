import type { AuthChangeEvent } from '@supabase/supabase-js';

import { mapToAuthUser } from '@/shared/auth/supabaseAuth';
import type { AuthUser } from '@/shared/hooks/useAuth';
import { UUID_RE } from '@/shared/utils/authUserParser';

interface SessionUserLike {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

/**
 * Everything the auth state listener must execute after one auth event,
 * decided in one place. The imperative shell (AuthProvider) runs this plan
 * without making any decision of its own.
 */
export interface AuthTransitionPlan {
  /** Value to sync into React state, localStorage, and Sentry. */
  nextUser: AuthUser | null;
  /** User to persist via createUserIfNotExists, or null to skip. */
  userToCreate: AuthUser | null;
  /** Whether the one-shot creation-attempt flag should be cleared. */
  resetAttemptFlag: boolean;
}

/**
 * Pure decision for a Supabase auth state change.
 *
 * `alreadyAttempted` must be passed in as a snapshot; reading the mutable
 * ref inside this function would make it time-dependent again.
 */
export function decideAuthTransition(
  event: AuthChangeEvent,
  sessionUser: SessionUserLike | null | undefined,
  alreadyAttempted: boolean,
): AuthTransitionPlan {
  const hasValidId = sessionUser !== null && sessionUser !== undefined && UUID_RE.test(sessionUser.id);
  const nextUser = hasValidId ? mapToAuthUser(sessionUser) : null;

  const isSignInKind = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
  const shouldCreateUser = isSignInKind && nextUser !== null && !alreadyAttempted;

  return {
    nextUser,
    userToCreate: shouldCreateUser ? nextUser : null,
    resetAttemptFlag: nextUser === null,
  };
}
