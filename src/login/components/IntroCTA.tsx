import { Button } from '@/shared/ui/button';

interface IntroCTAProps {
  cohort?: number;
  onLogin: () => void;
  isLoading?: boolean;
}

export default function IntroCTA({ onLogin, cohort, isLoading = false }: IntroCTAProps) {
  return (
    <div className='fixed inset-x-0 bottom-0 border-t bg-background p-4'>
      <div className='mx-auto max-w-3xl px-6 lg:max-w-4xl'>
        <Button variant='cta' onClick={onLogin} className='w-full' size='lg' disabled={isLoading}>
          {isLoading ? '처리 중...' : cohort ? `${cohort}기 시작하기` : '시작하기'}
        </Button>
      </div>
    </div>
  );
}
