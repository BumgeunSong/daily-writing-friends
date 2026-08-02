import * as Sentry from '@sentry/react';

import type { Database } from '@/shared/external/database.types';
import type { User } from '@/user/model/User';

/**
 * The `users` columns the boundary reads. Derived from the generated schema so a
 * column rename surfaces here at compile time. `known_buddy_uid` is read only by
 * the single-user fetch, so it is not part of this projection.
 */
export type UserRow = Pick<
  Database['public']['Tables']['users']['Row'],
  | 'id'
  | 'real_name'
  | 'nickname'
  | 'email'
  | 'profile_photo_url'
  | 'bio'
  | 'phone_number'
  | 'kakao_id'
  | 'referrer'
  | 'onboarding_complete'
  | 'timezone'
>;

export type BoardPermission = 'read' | 'write';

/**
 * Parse an untrusted `permission` text column into a BoardPermission.
 * Degrade-closed: an unknown value falls back to 'read' (least privilege) and is
 * reported to Sentry, so a corrupt row can never silently grant write access.
 */
export function parseBoardPermission(raw: string): BoardPermission {
  if (raw === 'read' || raw === 'write') return raw;
  Sentry.captureMessage('Unknown board permission value', {
    level: 'warning',
    extra: { raw },
  });
  return 'read';
}

/** Pure projection of a `users` row onto the User domain model. */
export function mapToUser(
  row: UserRow,
  extras: {
    boardPermissions?: Record<string, BoardPermission>;
    knownBuddy?: User['knownBuddy'];
  } = {},
): User {
  return {
    uid: row.id,
    realName: row.real_name,
    nickname: row.nickname,
    email: row.email,
    profilePhotoURL: row.profile_photo_url,
    bio: row.bio,
    phoneNumber: row.phone_number,
    kakaoId: row.kakao_id,
    referrer: row.referrer,
    onboardingComplete: row.onboarding_complete ?? false,
    boardPermissions: extras.boardPermissions ?? {},
    updatedAt: null,
    knownBuddy: extras.knownBuddy,
    profile: row.timezone ? { timezone: row.timezone } : undefined,
  };
}
