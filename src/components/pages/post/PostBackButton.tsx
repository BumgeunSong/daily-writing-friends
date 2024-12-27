import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PostBackButtonProps {
  boardId: string;
  className?: string;
}

export function PostBackButton({ boardId, className }: PostBackButtonProps) {
  return (
    <Link to={`/board/${boardId}`}>
      <Button variant='ghost' className={className}>
        <ChevronLeft className='mr-2 size-4' /> 피드로 돌아가기
      </Button>
    </Link>
  );
}
