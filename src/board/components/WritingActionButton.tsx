import { Plus, X, PenSquare, CookingPot, Sparkle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import useWritePermission from '@/shared/hooks/useWritePermission';
import { Button } from '@/shared/ui/button';
import { cn } from "@/shared/utils/cn";

interface WritingActionButtonProps {
  boardId: string;
}

interface WritingActionItemProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ariaLabel: string;
  isExpanded: boolean;
  onClose: () => void;
}

function WritingActionItem({ 
  to, 
  icon: Icon, 
  label, 
  ariaLabel, 
  isExpanded, 
  onClose 
}: WritingActionItemProps) {
  return (
    <Link
      to={to}
      className="group flex items-center"
      onClick={onClose}
    >
      <span className={cn(
        "mr-2 px-2 py-1 bg-card text-card-foreground rounded text-sm reading-shadow transition-opacity duration-200",
        isExpanded ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
      )}>
        {label}
      </span>
      <Button
        variant="default"
        size="sm"
        className="reading-shadow reading-focus size-10 rounded-full transition-all duration-200 hover:scale-110 active:scale-[0.99]"
        aria-label={ariaLabel}
      >
        <Icon className="size-4" />
      </Button>
    </Link>
  );
}

interface ExpandedMenuProps {
  boardId: string;
  isExpanded: boolean;
  onClose: () => void;
}

function ExpandedMenu({ boardId, isExpanded, onClose }: ExpandedMenuProps) {
  const actions = [
    {
      to: `/board/${boardId}/free-writing/intro`,
      icon: Sparkle,
      label: "프리라이팅",
      ariaLabel: "Start Freewriting"
    },
    {
      to: `/create/${boardId}`,
      icon: PenSquare,
      label: "일반 글쓰기",
      ariaLabel: "Create Normal Post"
    },
    {
      to: `/board/${boardId}/topic-cards`,
      icon: CookingPot,
      label: "글감 목록",
      ariaLabel: "Show Topic Cards"
    }
  ];

  return (
    <div
      className={cn(
        "flex flex-col items-end space-y-2 transition-all duration-200 ease-in-out",
        isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      {actions.map((action) => (
        <WritingActionItem
          key={action.to}
          to={action.to}
          icon={action.icon}
          label={action.label}
          ariaLabel={action.ariaLabel}
          isExpanded={isExpanded}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

interface MainToggleButtonProps {
  isExpanded: boolean;
  onToggle: () => void;
}

function MainToggleButton({ isExpanded, onToggle }: MainToggleButtonProps) {
  return (
    <Button
      variant="cta"
      size="icon"
      className="reading-shadow reading-focus z-50 size-12 rounded-full transition-all duration-200 hover:scale-110 active:scale-[0.99]"
      aria-label={isExpanded ? "Close Writing Options" : "Open Writing Options"}
      onClick={onToggle}
    >
      {isExpanded ? <X className="size-5" /> : <Plus className="size-5" />}
    </Button>
  );
}

export function WritingActionButton({ boardId }: WritingActionButtonProps) {
  const { currentUser } = useAuth();
  const { writePermission, isLoading } = useWritePermission(
    currentUser?.uid ?? null,
    boardId
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => setIsExpanded(!isExpanded);
  const closeExpanded = () => setIsExpanded(false);

  if (isLoading || !writePermission) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end space-y-2">
      <ExpandedMenu 
        boardId={boardId} 
        isExpanded={isExpanded} 
        onClose={closeExpanded} 
      />
      <MainToggleButton 
        isExpanded={isExpanded} 
        onToggle={toggleExpand} 
      />
    </div>
  );
}