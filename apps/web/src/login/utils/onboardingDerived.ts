import type { Board } from '@/board/model/Board';
import type { OnboardingSubmitAction } from './onboardingSubmit';

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
  requiresCohortAgreement: boolean;
  hasAgreedToCohort: boolean;
}

/**
 * Pure derivation of the submit-disabled flag.
 * Disabled if submitting, prefill failed, or cohort agreement required-but-missing.
 */
export function isSubmitDisabled({
  isSubmitting,
  hasPrefillError,
  requiresCohortAgreement,
  hasAgreedToCohort,
}: SubmitDisabledInput): boolean {
  if (isSubmitting || hasPrefillError) return true;
  return requiresCohortAgreement && !hasAgreedToCohort;
}

export interface NavigateArgs {
  path: string;
  options?: { state: unknown };
}

/**
 * Pure conversion of an OnboardingSubmitAction's navigateTo descriptor into
 * the (path, options) tuple react-router's `navigate` expects.
 * Replaces the if/else navigate branch in OnboardingPage.onSubmit.
 */
export function getNavigateArgs(action: OnboardingSubmitAction): NavigateArgs {
  if (action.kind === 'updateThenWaitlist') {
    return {
      path: action.navigateTo.path,
      options: { state: action.navigateTo.state },
    };
  }
  return { path: action.navigateTo.path };
}

export const SUBMIT_ERROR_FALLBACK = '신청에 실패했습니다. 잠시 후 다시 시도해주세요.';

export function getSubmitErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : SUBMIT_ERROR_FALLBACK;
}
