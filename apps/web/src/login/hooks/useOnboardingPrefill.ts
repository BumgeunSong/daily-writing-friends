import { useEffect, useRef, useState } from 'react';
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
}

/**
 * Loads the user's existing profile (if any) and resets the onboarding form with
 * the derived values. While in flight, `isPrefilling` is true. If the fetch
 * fails, `prefillError` is set so the page can BLOCK submit — preventing a
 * transient outage from overwriting real profile data with blank defaults.
 *
 * The form's `activeContactTab` field is the single source of truth for which
 * contact tab is active — `reset()` sets it from the prefilled values, so the
 * page can simply read it via `watch()` without mirroring into local state.
 */
export function useOnboardingPrefill(
  { uid, displayName, authLoading }: PrefillSource,
  form: UseFormReturn<OnboardingFormSchema>,
): UseOnboardingPrefillResult {
  const { reset } = form;
  const [isPrefilling, setIsPrefilling] = useState(true);
  const [prefillError, setPrefillError] = useState<string | null>(null);
  // Prefill is one-shot. Once it succeeds, later changes to `displayName`
  // (e.g., when Google profile resolves after first paint) must NOT re-fire the
  // effect, because `reset()` would clobber any field the user has begun
  // editing. The original code used `setValue('nickname', ...)` for the
  // no-existing-user branch, which only touched that one field; with `reset`
  // we have to guard the run instead.
  const didPrefill = useRef(false);

  useEffect(() => {
    if (!uid || authLoading || didPrefill.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const existing = await fetchUser(uid);
        if (cancelled) return;
        reset(buildPrefillFormValues(existing ?? null, displayName ?? null));
        didPrefill.current = true;
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

  return { isPrefilling, prefillError };
}
