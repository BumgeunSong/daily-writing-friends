/**
 * Pure decision function for onboarding form submission.
 * Tested by `onboardingSubmit.test.ts`.
 *
 * Returns a discriminated union the calling component executes by mapping each `kind`
 * to the appropriate side effects (updateUser, addUserToBoardWaitingList, navigate).
 * No hooks or Supabase types here — only plain data.
 */

import type { User } from '@/user/model/User';

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
      profilePayload: Partial<User>;
      navigateTo: { path: '/join/complete'; state: { name: string; cohort: number } };
    }
  | {
      kind: 'updateOnly';
      uid: string;
      profilePayload: Partial<User>;
      navigateTo: { path: '/boards' };
    };

export type SubmitStepKind = 'createUser' | 'writeProfile' | 'joinWaitlist' | 'markComplete';

function buildProfilePayload(values: OnboardingFormValues): Partial<User> {
  const trimmedReferrer = values.referrer.trim();
  const isPhoneTab = values.activeContactTab === 'phone';
  return {
    realName: values.realName.trim(),
    nickname: values.nickname.trim(),
    phoneNumber: isPhoneTab ? values.phone.replace(/\D/g, '') : null,
    kakaoId: isPhoneTab ? null : values.kakaoId.trim(),
    referrer: trimmedReferrer.length > 0 ? trimmedReferrer : null,
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
        state: { name: profilePayload.realName ?? '', cohort: ctx.upcomingCohort },
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

/**
 * Returns the side-effect step order. `markComplete` is always LAST so a crash
 * between steps leaves `onboardingComplete=false`; the user lands back on
 * `/join/onboarding` and re-submitting is idempotent for every prior step.
 */
export function getSubmitStepOrder(action: OnboardingSubmitAction): SubmitStepKind[] {
  if (action.kind === 'updateThenWaitlist') {
    return ['createUser', 'writeProfile', 'joinWaitlist', 'markComplete'];
  }
  return ['createUser', 'writeProfile', 'markComplete'];
}
