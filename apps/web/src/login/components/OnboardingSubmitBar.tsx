import { getSubmitCtaLabel, isSubmitDisabled } from '@/login/utils/onboardingDerived';
import { Button } from '@/shared/ui/button';

interface OnboardingSubmitBarProps {
  isSubmitting: boolean;
  hasPrefillError: boolean;
  requiresCohortAgreement: boolean;
  hasAgreedToCohort: boolean;
  hasCohort: boolean;
}

/** Sticky bottom submit bar. Delegates label/disabled to pure helpers. */
export default function OnboardingSubmitBar({
  isSubmitting,
  hasPrefillError,
  requiresCohortAgreement,
  hasAgreedToCohort,
  hasCohort,
}: OnboardingSubmitBarProps) {
  return (
    <div className="sticky inset-x-0 bottom-0 border-t border-border bg-background p-4">
      <div className="mx-auto max-w-3xl lg:max-w-4xl">
        <Button
          variant="cta"
          type="submit"
          form="onboarding-form"
          className="w-full"
          size="lg"
          disabled={isSubmitDisabled({
            isSubmitting,
            hasPrefillError,
            requiresCohortAgreement,
            hasAgreedToCohort,
          })}
        >
          {getSubmitCtaLabel({ isSubmitting, hasCohort })}
        </Button>
      </div>
    </div>
  );
}
