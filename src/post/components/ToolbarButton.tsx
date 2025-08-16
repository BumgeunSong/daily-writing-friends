import { Button } from '@/shared/ui/button';
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
    <Button
      type='button'
      variant='ghost'
      size='icon'
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={ariaLabel || title}
      title={title}
      className={cn(
        'size-10 shrink-0 transition-colors',
        isActive
          ? 'bg-accent/20 text-accent hover:bg-accent/30'
          : 'hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      style={{ touchAction: 'manipulation' }}
    >
      {icon}
    </Button>
  );
}