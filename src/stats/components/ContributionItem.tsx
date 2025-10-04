import { memo, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/utils/cn';
import { Contribution } from '@/stats/model/WritingStats';
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils';

// Contribution | CommentingContribution 모두 지원
interface ContributionItemProps {
  contribution?: Contribution | CommentingContribution;
  value: number | null;
  maxValue: number;
}

type CombinedContribution = Contribution | CommentingContribution | undefined;

function isWritingContribution(c: CombinedContribution): c is Contribution {
  return !!c && ('contentLength' in c || 'isRecovered' in c);
}

function useContributionMeta(
  contribution: CombinedContribution,
  value: number | null,
  maxValue: number,
) {
  return useMemo(() => {
    const isRecovered = isWritingContribution(contribution)
      ? Boolean(contribution.isRecovered)
      : false;
    const isHoliday = contribution?.isHoliday ?? false;

    const intensity = isRecovered
      ? -1
      : isHoliday
        ? -2
        : !value
          ? 0
          : Math.ceil((value / Math.max(maxValue, 1)) * 4);

    const createdAt = contribution?.createdAt;
    const parsed = createdAt ? new Date(createdAt) : null;
    const yearMonthDay = parsed
      ? parsed.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '';
    const day = parsed ? parsed.getDate().toString() : '';

    return { intensity, yearMonthDay, day, isRecovered, isHoliday };
  }, [contribution, value, maxValue]);
}

function useContributionClasses(intensity: number, isRecovered: boolean, isHoliday: boolean) {
  const containerClassName = useMemo(
    () =>
      cn(
        'aspect-square w-full rounded-sm relative flex items-center justify-center border border-border/30',
        isRecovered && 'bg-blue-400 dark:bg-blue-400/80',
        isHoliday && 'bg-gray-300 dark:bg-gray-600',
        !isRecovered && !isHoliday && intensity === 0 && 'bg-muted/50',
        !isRecovered && !isHoliday && intensity === 1 && 'bg-green-200 dark:bg-green-800/60',
        !isRecovered && !isHoliday && intensity === 2 && 'bg-green-400 dark:bg-green-600/70',
        !isRecovered && !isHoliday && intensity === 3 && 'bg-green-600 dark:bg-green-500/80',
        !isRecovered && !isHoliday && intensity === 4 && 'bg-green-800 dark:bg-green-400',
      ),
    [intensity, isRecovered, isHoliday],
  );

  const textClassName = useMemo(
    () =>
      cn(
        'text-[0.6rem] font-medium',
        isRecovered || intensity >= 3 ? 'text-white' : 'text-muted-foreground',
      ),
    [intensity, isRecovered],
  );

  return { containerClassName, textClassName };
}

function ContributionItemInner({ contribution, value, maxValue }: ContributionItemProps) {
  const { intensity, yearMonthDay, day, isRecovered, isHoliday } = useContributionMeta(
    contribution,
    value,
    maxValue,
  );
  const { containerClassName, textClassName } = useContributionClasses(
    intensity,
    isRecovered,
    isHoliday,
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={containerClassName}>
            <span className={textClassName}>{day}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className='text-xs'>
            {yearMonthDay}
            {isRecovered ? ' (회복됨)' : ''}
            {isHoliday ? ' (공휴일)' : ''}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ContributionItem = memo(ContributionItemInner);
