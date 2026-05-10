/**
 * Pure decision function for onboarding form submission.
 * Tested by `onboardingSubmit.test.ts`.
 *
 * Returns a discriminated union the calling component executes by mapping each `kind`
 * to the appropriate side effects (updateUser, addUserToBoardWaitingList, navigate).
 * No hooks or Supabase types here — only plain data.
 */

import type { SupabaseUserUpdate } from '@/user/utils/userMappers';

export interface OnboardingFormValues {
  realName: string;
  nickname: string;
  phone: string;
  kakaoId: string;
  referrer: string;
  activeContactTab: 'phone' | 'kakao';
}

export interface OnboardingSubmitContext {
  uid: string;
  upcomingBoardId: string | null;
  upcomingCohort: number | null;
}

export type OnboardingSubmitAction =
  | {
      kind: 'updateThenWaitlist';
      uid: string;
      boardId: string;
      cohort: number;
      profilePayload: SupabaseUserUpdate;
      navigateTo: { path: '/join/complete'; state: { name: string; cohort: number } };
    }
  | {
      kind: 'updateOnly';
      uid: string;
      profilePayload: SupabaseUserUpdate;
      navigateTo: { path: '/boards' };
    };

function buildProfilePayload(values: OnboardingFormValues): SupabaseUserUpdate {
  const referrer = values.referrer.trim();
  const isPhoneTab = values.activeContactTab === 'phone';
  return {
    real_name: values.realName.trim(),
    nickname: values.nickname.trim(),
    phone_number: isPhoneTab ? values.phone.replace(/\D/g, '') : null,
    kakao_id: isPhoneTab ? null : values.kakaoId.trim(),
    referrer: referrer.length > 0 ? referrer : null,
    onboarding_complete: true,
  };
}

export function resolveOnboardingSubmit(
  values: OnboardingFormValues,
  ctx: OnboardingSubmitContext,
): OnboardingSubmitAction {
  const profilePayload = buildProfilePayload(values);

  if (ctx.upcomingBoardId && ctx.upcomingCohort !== null) {
    return {
      kind: 'updateThenWaitlist',
      uid: ctx.uid,
      boardId: ctx.upcomingBoardId,
      cohort: ctx.upcomingCohort,
      profilePayload,
      navigateTo: {
        path: '/join/complete',
        state: { name: profilePayload.real_name ?? '', cohort: ctx.upcomingCohort },
      },
    };
  }

  return {
    kind: 'updateOnly',
    uid: ctx.uid,
    profilePayload,
    navigateTo: { path: '/boards' },
  };
}
