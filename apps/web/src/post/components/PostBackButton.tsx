import { ChevronLeft } from 'lucide-react';
import { useNavigate } from '@/shared/navigation';
import { Button } from '@/shared/ui/button';

interface PostBackButtonProps {
  className?: string;
}

export function PostBackButton({ className }: PostBackButtonProps) {
  const navigate = useNavigate();
  const handleBack = () => {
    document.documentElement.dataset.transition = 'back';
    navigate(-1);
  };
  return (
    <Button
      variant='ghost'
      className={className}
      onClick={handleBack}
      aria-label="뒤로가기"
    >
      <ChevronLeft className='size-4' />
      </Button>
  );
}
