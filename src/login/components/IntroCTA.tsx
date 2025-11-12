import { Button } from '@/shared/ui/button';

interface IntroCTAProps {
  cohort?: number;
  onLogin: () => void;
  isLoading?: boolean;
  isInWaitingList?: boolean;
}

export default function IntroCTA({ onLogin, cohort, isLoading = false, isInWaitingList = false }: IntroCTAProps) {
  const getButtonText = () => {
    if (isLoading) return '처리 중...';
    if (isInWaitingList && cohort) return `${cohort}기 신청 완료`;
    if (cohort) return `${cohort}기 시작하기`;
    return '시작하기';
  };

  const isDisabled = isLoading || isInWaitingList;

  return (
    <div className='fixed inset-x-0 bottom-0 border-t bg-background p-4'>
      <div className='mx-auto max-w-3xl px-6 lg:max-w-4xl'>
        <Button variant='cta' onClick={onLogin} className='w-full' size='lg' disabled={isDisabled}>
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
}
