import type { User } from '@/user/model/User';
import { ONBOARDING_FORM_DEFAULTS, type OnboardingFormSchema } from './onboardingSchema';

/**
 * Pure decision for which contact tab to show given an existing profile.
 * Existing kakaoId without a phone number → kakao tab; otherwise phone tab.
 */
export function pickInitialContactTab(existing: User | null): 'phone' | 'kakao' {
  if (!existing) return 'phone';
  return existing.kakaoId && !existing.phoneNumber ? 'kakao' : 'phone';
}

/**
 * Pure derivation of initial form values for the onboarding form.
 * Handles both the returning-user path (seed from `existing`) and the
 * first-time path (seed nickname from auth `displayName` if available).
 * Returning `null` realName/nickname/etc. coerce to empty strings so
 * react-hook-form receives a consistent shape.
 */
export function buildPrefillFormValues(
  existing: User | null,
  displayName: string | null | undefined,
): OnboardingFormSchema {
  if (existing) {
    return {
      realName: existing.realName ?? '',
      nickname: existing.nickname ?? displayName ?? '',
      phone: existing.phoneNumber ?? '',
      kakaoId: existing.kakaoId ?? '',
      referrer: existing.referrer ?? '',
      activeContactTab: pickInitialContactTab(existing),
    };
  }
  return {
    ...ONBOARDING_FORM_DEFAULTS,
    nickname: displayName ?? '',
  };
}

export const PREFILL_ERROR_MESSAGE =
  '기존 정보를 불러오지 못했어요. 새로고침 후 다시 시도해주세요. 그대로 제출하면 기존 정보가 덮어쓰일 수 있어요.';
