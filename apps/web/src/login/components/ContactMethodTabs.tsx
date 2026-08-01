import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { OnboardingFormSchema } from '@/login/utils/onboardingSchema';
import FormField from '@/shared/components/FormField';

interface ContactMethodTabsProps {
  tab: 'phone' | 'kakao';
  onTabChange: (next: 'phone' | 'kakao') => void;
  register: UseFormRegister<any>;
  typedRegister: UseFormRegister<OnboardingFormSchema>;
  errors: FieldErrors<OnboardingFormSchema>;
}

interface TabButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function TabButton({ active, label, onClick }: TabButtonProps) {
  const activeClasses = active
    ? 'bg-background text-foreground shadow-sm'
    : 'text-muted-foreground hover:text-foreground';
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${activeClasses}`}
    >
      {label}
    </button>
  );
}

/**
 * Phone/Kakao contact tabs. Renders the matching FormField and a hidden input
 * mirroring the tab choice for the form's `activeContactTab` field.
 */
export default function ContactMethodTabs({
  tab,
  onTabChange,
  register,
  typedRegister,
  errors,
}: ContactMethodTabsProps) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium lg:text-base">연락처</span>
      <div
        role="tablist"
        aria-label="연락처 입력 방식 선택"
        className="inline-flex rounded-md border border-border bg-muted p-1"
      >
        <TabButton active={tab === 'phone'} label="전화번호" onClick={() => onTabChange('phone')} />
        <TabButton active={tab === 'kakao'} label="카카오 ID" onClick={() => onTabChange('kakao')} />
      </div>

      <input type="hidden" {...typedRegister('activeContactTab')} value={tab} />

      {tab === 'phone' ? (
        <FormField
          id="phone"
          label="전화번호"
          labelClassName="sr-only"
          type="tel"
          inputMode="numeric"
          placeholder="ex. 01012345678"
          register={register}
          error={errors.phone}
        />
      ) : (
        <FormField
          id="kakaoId"
          label="카카오 ID"
          labelClassName="sr-only"
          type="text"
          inputMode="text"
          placeholder="카카오톡 ID"
          register={register}
          error={errors.kakaoId}
        />
      )}
      <p className="text-xs text-muted-foreground">
        매글프 단체 카톡방이 만들어져요. 카톡방에 초대하기 위해 필요한 정보예요.
      </p>
    </div>
  );
}
