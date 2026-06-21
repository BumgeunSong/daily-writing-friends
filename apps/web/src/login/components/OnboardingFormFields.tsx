import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { OnboardingFormSchema } from '@/login/utils/onboardingSchema';
import ContactMethodTabs from './ContactMethodTabs';
import FormField from './JoinFormField';

interface OnboardingFormFieldsProps {
  tab: 'phone' | 'kakao';
  onTabChange: (next: 'phone' | 'kakao') => void;
  register: UseFormRegister<any>;
  typedRegister: UseFormRegister<OnboardingFormSchema>;
  errors: FieldErrors<OnboardingFormSchema>;
  prefillError: string | null;
  submitError: string | null;
}

/** All visible form rows + inline error rows for the onboarding form. */
export default function OnboardingFormFields({
  tab,
  onTabChange,
  register,
  typedRegister,
  errors,
  prefillError,
  submitError,
}: OnboardingFormFieldsProps) {
  return (
    <>
      <FormField
        id="realName"
        label="이름"
        type="text"
        inputMode="text"
        placeholder="이름을 입력해주세요"
        register={register}
        error={errors.realName}
      />
      <FormField
        id="nickname"
        label="필명"
        type="text"
        inputMode="text"
        placeholder="매글프에서 사용할 이름"
        register={register}
        error={errors.nickname}
      />
      <ContactMethodTabs
        tab={tab}
        onTabChange={onTabChange}
        register={register}
        typedRegister={typedRegister}
        errors={errors}
      />
      <FormField
        id="referrer"
        label="추천인"
        type="text"
        inputMode="text"
        placeholder="매글프를 소개해준 지인 이름 (선택)"
        register={register}
        error={errors.referrer}
        optional
      />
      {prefillError && (
        <p className="text-sm text-destructive" role="alert">{prefillError}</p>
      )}
      {submitError && <p className="text-sm text-destructive">{submitError}</p>}
    </>
  );
}
