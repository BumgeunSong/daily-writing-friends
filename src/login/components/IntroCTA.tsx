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

  const showBoardsAccess = isLoggedIn && isInWaitingList;

  const getButtonText = () => {
    if (isLoading) return '처리 중...';
    if (showBoardsAccess) return '게시판 보기';
    if (isInWaitingList && cohort) return `${cohort}기 신청 완료`;
    if (cohort) return `${cohort}기 시작하기`;
    return '시작하기';
  };

  const getStatusMessage = () => {
    if (showBoardsAccess && cohort) {
      return `${cohort}기 신청 완료`;
    }
    return null;
  };

  const handleClick = () => {
    if (showBoardsAccess) {
      navigate('/boards');
    } else {
      onLogin();
    }
  };

  const isDisabled = isLoading || (isInWaitingList && !showBoardsAccess);
  const statusMessage = getStatusMessage();

  return (
    <div className='fixed inset-x-0 bottom-0 border-t bg-background p-4'>
      <div className='mx-auto max-w-3xl px-6 lg:max-w-4xl'>
        {statusMessage && (
          <p className='mb-2 text-center text-sm text-muted-foreground'>{statusMessage}</p>
        )}
        <Button variant='cta' onClick={handleClick} className='w-full' size='lg' disabled={isDisabled}>
          {getButtonText()}
        </Button>
      </div>
    </div>
  );
}
