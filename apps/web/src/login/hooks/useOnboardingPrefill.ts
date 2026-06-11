import { useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { fetchUser } from '@/user/api/user';
import { buildPrefillFormValues, PREFILL_ERROR_MESSAGE } from '@/login/utils/onboardingPrefill';
import type { OnboardingFormSchema } from '@/login/utils/onboardingSchema';

interface PrefillSource {
  uid: string | undefined;
  displayName: string | null | undefined;
  authLoading: boolean;
}

export interface UseOnboardingPrefillResult {
  isPrefilling: boolean;
  prefillError: string | null;
  initialContactTab: 'phone' | 'kakao';
}

/**
 * Loads the user's existing profile (if any) and resets the onboarding form with
 * the derived values. While in flight, `isPrefilling` is true. If the fetch
 * fails, `prefillError` is set so the page can BLOCK submit — preventing a
 * transient outage from overwriting real profile data with blank defaults.
 *
 * Sets `initialContactTab` from the prefilled values so the page's tab UI stays
 * in sync without duplicating the picker logic.
 */
export function useOnboardingPrefill(
  { uid, displayName, authLoading }: PrefillSource,
  form: UseFormReturn<OnboardingFormSchema>,
): UseOnboardingPrefillResult {
  const { reset } = form;
  const [isPrefilling, setIsPrefilling] = useState(true);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [initialContactTab, setInitialContactTab] = useState<'phone' | 'kakao'>('phone');

  useEffect(() => {
    if (!uid || authLoading) return;
    let cancelled = false;
    void (async () => {
      try {
        const existing = await fetchUser(uid);
        if (cancelled) return;
        const values = buildPrefillFormValues(existing ?? null, displayName ?? null);
        reset(values);
        setInitialContactTab(values.activeContactTab);
        setPrefillError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('useOnboardingPrefill error', err);
        setPrefillError(PREFILL_ERROR_MESSAGE);
      } finally {
        if (!cancelled) setIsPrefilling(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, displayName, authLoading, reset]);

  return { isPrefilling, prefillError, initialContactTab };
}
