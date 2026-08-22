import {
  getSubmitBlockedReason,
  getSubmitCtaLabel,
  isSubmitDisabled,
} from '@/login/utils/onboardingDerived';
import { Button } from '@/shared/ui/button';

const BLOCKED_REASON_ID = 'onboarding-submit-blocked-reason';

interface OnboardingSubmitBarProps {
  isSubmitting: boolean;
  hasPrefillError: boolean;
  hasCohort: boolean;
}

/** Sticky bottom submit bar. Delegates label/disabled to pure helpers. */
export default function OnboardingSubmitBar({
  isSubmitting,
  hasPrefillError,
  hasCohort,
}: OnboardingSubmitBarProps) {
  const blockedReason = getSubmitBlockedReason({ isSubmitting, hasPrefillError });

  return (
    <div className="sticky inset-x-0 bottom-0 border-t border-border bg-background p-4">
      <div className="mx-auto max-w-3xl space-y-2 lg:max-w-4xl">
        {blockedReason && (
          <p
            id={BLOCKED_REASON_ID}
            role="status"
            className="text-center text-sm text-destructive"
          >
            {blockedReason}
          </p>
        )}
        <Button
          variant="cta"
          type="submit"
          form="onboarding-form"
          className="h-11 w-full"
          size="lg"
          disabled={isSubmitDisabled({ isSubmitting, hasPrefillError })}
          aria-describedby={blockedReason ? BLOCKED_REASON_ID : undefined}
        >
          {getSubmitCtaLabel({ isSubmitting, hasCohort })}
        </Button>
      </div>
    </div>
  );
}
