import { Plus, X, PenSquare, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@shared/hooks/useAuth';
import useWritePermission from '@/hooks/useWritePermission';
import { cn } from '@/lib/utils';

interface WritingActionButtonProps {
  boardId: string;
}

export function WritingActionButton({ boardId }: WritingActionButtonProps) {
  const { currentUser } = useAuth();
  const { writePermission, isLoading } = useWritePermission(
    currentUser?.uid ?? null,
    boardId
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  if (isLoading || !writePermission) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end space-y-2">
      <div
        className={cn(
          "flex flex-col items-end space-y-2 transition-all duration-300 ease-in-out",
          isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <Link
          to={`/board/${boardId}/free-writing/intro`}
          className="group flex items-center"
          onClick={() => setIsExpanded(false)}
        >
          <span className={cn(
            "mr-2 px-2 py-1 bg-card text-card-foreground rounded text-sm shadow-sm transition-opacity duration-200",
            isExpanded ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
          )}>
            프리라이팅
          </span>
          <Button
            size="sm"
            className="size-10 rounded-full bg-secondary text-secondary-foreground shadow-md transition-transform hover:scale-110"
            aria-label="Start Freewriting"
          >
            <Sparkles className="size-4" />
          </Button>
        </Link>

        <Link
          to={`/create/${boardId}`}
          className="group flex items-center"
          onClick={() => setIsExpanded(false)}
        >
          <span className={cn(
            "mr-2 px-2 py-1 bg-card text-card-foreground rounded text-sm shadow-sm transition-opacity duration-200",
            isExpanded ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
          )}>
            일반 글쓰기
          </span>
          <Button
            size="sm"
            className="size-10 rounded-full bg-secondary text-secondary-foreground shadow-md transition-transform hover:scale-110"
            aria-label="Create Normal Post"
          >
            <PenSquare className="size-4" />
          </Button>
        </Link>
      </div>

      <Button
        size="icon"
        className="z-50 size-12 rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
        aria-label={isExpanded ? "Close Writing Options" : "Open Writing Options"}
        onClick={toggleExpand}
      >
        {isExpanded ? <X className="size-5" /> : <Plus className="size-5" />}
      </Button>
    </div>
  );
} 