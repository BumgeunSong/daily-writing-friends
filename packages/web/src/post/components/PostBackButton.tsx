import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';

interface PostBackButtonProps {
  className?: string;
}

export function PostBackButton({ className }: PostBackButtonProps) {
  const navigate = useNavigate();
  return (
    <Button
      variant='ghost'
      className={className}
      onClick={() => navigate(-1)}
      aria-label="뒤로가기"
    >
      <ChevronLeft className='size-4' />
      </Button>
  );
}
