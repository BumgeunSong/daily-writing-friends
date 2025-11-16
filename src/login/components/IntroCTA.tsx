import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';

interface IntroCTAProps {
  cohort?: number;
  onLogin: () => void;
  isLoading?: boolean;
  isInWaitingList?: boolean;
  isLoggedIn?: boolean;
}

export default function IntroCTA({
  onLogin,
  cohort,
  isLoading = false,
  isInWaitingList = false,
  isLoggedIn = false,
}: IntroCTAProps) {
  const navigate = useNavigate();

  const getPrimaryButtonText = () => {
    if (isLoading) return '처리 중...';
    if (isInWaitingList) return `${cohort}기 신청 완료`;
    if (cohort) return `${cohort}기 시작하기`;
    return '시작하기';
  };

  const getStatusMessage = () => {
    if (isLoggedIn && isInWaitingList && cohort) {
      return `${cohort}기 신청 완료`;
    }
    return null;
  };

  const handlePrimaryClick = () => {
    onLogin();
  };

  const handleSecondaryClick = () => {
    navigate('/boards');
  };

  const isPrimaryDisabled = isLoading || isInWaitingList;
  const statusMessage = getStatusMessage();

  return (
    <div className='fixed inset-x-0 bottom-0 border-t bg-background p-4'>
      <div className='mx-auto max-w-3xl px-6 lg:max-w-4xl'>
        {statusMessage && (
          <p className='mb-2 text-center text-sm text-muted-foreground'>{statusMessage}</p>
        )}
        <div className='flex gap-3'>
          <Button
            variant='ghost'
            onClick={handleSecondaryClick}
            className='flex-1 text-foreground hover:bg-transparent hover:text-foreground'
            size='lg'
            disabled={isLoading}
          >
            게시판 들어가기
          </Button>
          <Button
            variant='cta'
            onClick={handlePrimaryClick}
            className='flex-1'
            size='lg'
            disabled={isPrimaryDisabled}
          >
            {getPrimaryButtonText()}
          </Button>
        </div>
      </div>
    </div>
  );
}
