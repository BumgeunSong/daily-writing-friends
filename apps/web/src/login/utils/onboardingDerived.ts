import type { Board } from '@/board/model/Board';

export interface OnboardingHeader {
  title: string;
  subtitle: string;
}

/**
 * Pure derivation of the page header copy from the upcoming board.
 * `cohort` present → cohort-specific title; absent → generic profile-fill copy.
 * `firstDay` present → localized Korean date subtitle; absent → fallback copy.
 */
export function getOnboardingHeader(
  upcomingBoard: Board | null | undefined,
): OnboardingHeader {
  const title = upcomingBoard?.cohort
    ? `매글프 ${upcomingBoard.cohort}기 신청하기`
    : '프로필을 입력해주세요';

  if (!upcomingBoard?.firstDay) {
    return {
      title,
      subtitle: '아래 정보를 채우면 다음 기수가 열릴 때 안내드려요.',
    };
  }

  const formatted = upcomingBoard.firstDay
    .toDate()
    .toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  return { title, subtitle: `${formatted}에 시작합니다.` };
}

export interface SubmitCtaInput {
  isSubmitting: boolean;
  hasCohort: boolean;
}

/**
 * Pure derivation of the CTA label. Replaces the nested ternary in the JSX.
 */
export function getSubmitCtaLabel({ isSubmitting, hasCohort }: SubmitCtaInput): string {
  if (isSubmitting) return '신청 중...';
  return hasCohort ? '신청하기' : '저장하기';
}

export interface SubmitDisabledInput {
  isSubmitting: boolean;
  hasPrefillError: boolean;
}

/**
 * The single wording for a prefill failure. It is deliberately the only one:
 * rendering a second, differently-worded copy elsewhere would make two live
 * regions announce conflicting instructions for one failure.
 */
export const SUBMIT_BLOCKED_PREFILL_MESSAGE =
  '기존 정보를 불러오지 못해 신청할 수 없어요. 새로고침 후 다시 시도해주세요.';

/**
 * The message shown beside a disabled CTA, or null when nothing needs saying.
 * Every entry names the blocker and the way out, because the submit bar is
 * sticky and the user may never scroll to an explanation placed elsewhere.
 *
 * `isSubmitting` is deliberately absent: the CTA already reads 신청 중... and
 * clears on its own, so there is no action to prompt.
 */
export function getSubmitBlockedReason({ hasPrefillError }: SubmitDisabledInput): string | null {
  if (hasPrefillError) return SUBMIT_BLOCKED_PREFILL_MESSAGE;
  return null;
}

/**
 * Pure derivation of the submit-disabled flag, defined in terms of
 * `getSubmitBlockedReason` so the two can never drift: a blocker added there is
 * disabling here, and no blocker can disable the CTA without supplying its own
 * on-screen explanation. Invalid fields are not a blocker — the CTA stays live
 * and pressing it surfaces the per-field messages.
 */
export function isSubmitDisabled(input: SubmitDisabledInput): boolean {
  return input.isSubmitting || getSubmitBlockedReason(input) !== null;
}

export const SUBMIT_ERROR_FALLBACK = '신청에 실패했습니다. 잠시 후 다시 시도해주세요.';

export function getSubmitErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : SUBMIT_ERROR_FALLBACK;
}
