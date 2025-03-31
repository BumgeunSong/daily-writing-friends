import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WritingActionButtonProps {
  boardId: string;
}

export function WritingActionButton({ boardId }: WritingActionButtonProps) {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="fixed bottom-20 right-6">
              <Button 
                size="lg" 
                className="h-14 w-14 rounded-full bg-gray-400 text-white shadow-lg"
                disabled
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>오프라인 상태에서는 게시물을 작성할 수 없습니다</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="fixed bottom-20 right-6 z-50">
      <Link to={`/board/${boardId}/write`}>
        <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
} 