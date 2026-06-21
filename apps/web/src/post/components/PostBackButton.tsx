import { ChevronLeft } from 'lucide-react';
import { useViewTransitionNavigate } from '@/shared/navigation/useViewTransitionNavigate';
import { Button } from '@/shared/ui/button';

interface PostBackButtonProps {
  className?: string;
}

export function PostBackButton({ className }: PostBackButtonProps) {
  const { back } = useViewTransitionNavigate();
  return (
    <Button
      variant='ghost'
      className={className}
      onClick={back}
      aria-label="뒤로가기"
    >
      <ChevronLeft className='size-4' />
      </Button>
  );
}
