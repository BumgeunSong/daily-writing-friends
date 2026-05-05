import { Sprout } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface DonatorBadgeProps {
  className?: string;
}

export function DonatorBadge({ className }: DonatorBadgeProps) {
  return (
    <Sprout
      className={cn('size-3.5 shrink-0 text-emerald-500/70 dark:text-emerald-400/80', className)}
      aria-label="후원자"
    />
  );
}
