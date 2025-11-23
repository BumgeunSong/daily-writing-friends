import { cn } from '@/shared/utils/cn';

interface ToolbarButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  ariaLabel?: string;
  className?: string;
}

export function ToolbarButton({
  isActive,
  onClick,
  icon,
  title,
  ariaLabel,
  className,
}: ToolbarButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={ariaLabel || title}
      title={title}
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'text-foreground hover:bg-accent/10',
        isActive && 'bg-accent/20 text-accent hover:bg-accent/30',
        className,
      )}
      style={{ 
        touchAction: 'manipulation',
        backgroundColor: isActive ? undefined : 'transparent'
      }}
    >
      {icon}
    </button>
  );
}