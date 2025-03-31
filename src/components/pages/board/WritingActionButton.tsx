import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import useWritePermission from '@/hooks/useWritePermission';

interface WritingActionButtonProps {
  boardId: string;
}

export function WritingActionButton({ boardId }: WritingActionButtonProps) {
  const { currentUser } = useAuth();
  const { writePermission, isLoading } = useWritePermission(
    currentUser?.uid ?? null,
    boardId
  );

  if (isLoading || !writePermission) {
    return null;
  }

  return (
    <Link
      to={`/create/${boardId}`}
      className='fixed bottom-20 right-4 z-10 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
    >
      <Button
        size='icon'
        className='size-12 rounded-full bg-primary text-primary-foreground shadow-lg'
        aria-label='Create Post'
      >
        <Plus className='size-5' />
      </Button>
    </Link>
  );
} 