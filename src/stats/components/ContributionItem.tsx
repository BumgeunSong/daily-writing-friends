import { memo, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';
import { cn } from '@/shared/utils/cn';
import type { Contribution } from '@/stats/model/WritingStats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';

interface ContributionItemProps {
  contribution?: Contribution | CommentingContribution;
  value: number | null;
  maxValue: number;
}

type CombinedContribution = Contribution | CommentingContribution | undefined;

const INTENSITY_HOLIDAY = -2;
const INTENSITY_NONE = 0;
const MAX_INTENSITY_LEVELS = 4;
const HIGH_INTENSITY_THRESHOLD = 3;

function extractContributionFlags(contribution: CombinedContribution) {
  const isHoliday = contribution?.isHoliday ?? false;
  return { isHoliday };
}

function calculateIntensity(
  value: number | null,
  maxValue: number,
  isHoliday: boolean,
): number {
  if (isHoliday) return INTENSITY_HOLIDAY;
  if (!value) return INTENSITY_NONE;

  const normalizedValue = value / Math.max(maxValue, 1);
  return Math.ceil(normalizedValue * MAX_INTENSITY_LEVELS);
}

function formatDate(contribution: CombinedContribution) {
  const createdAt = contribution?.createdAt;
  if (!createdAt) return { yearMonthDay: '', day: '' };

  const parsed = new Date(createdAt);
  const yearMonthDay = parsed.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const day = parsed.getDate().toString();

  return { yearMonthDay, day };
}

function useContributionMeta(
  contribution: CombinedContribution,
  value: number | null,
  maxValue: number,
) {
  return useMemo(() => {
    const { isHoliday } = extractContributionFlags(contribution);
    const intensity = calculateIntensity(value, maxValue, isHoliday);
    const { yearMonthDay, day } = formatDate(contribution);
    const holidayName = contribution?.holidayName;

    return { intensity, yearMonthDay, day, isHoliday, holidayName };
  }, [contribution, value, maxValue]);
}

function getBackgroundColorClass(intensity: number, isHoliday: boolean) {
  if (isHoliday) return 'bg-amber-50 dark:bg-amber-950/40';

  const colorMap: Record<number, string> = {
    [INTENSITY_NONE]: 'bg-muted/50',
    1: 'bg-green-200 dark:bg-green-800/60',
    2: 'bg-green-400 dark:bg-green-600/70',
    3: 'bg-green-600 dark:bg-green-500/80',
    4: 'bg-green-800 dark:bg-green-400',
  };

  return colorMap[intensity] || '';
}

function getTextColorClass(intensity: number): string {
  const shouldUseWhiteText = intensity >= HIGH_INTENSITY_THRESHOLD;
  return shouldUseWhiteText ? 'text-white' : 'text-muted-foreground';
}

function useContributionClasses(intensity: number, isHoliday: boolean) {
  const containerClassName = useMemo(() => {
    const baseClasses =
      'aspect-square w-full rounded-sm relative flex items-center justify-center border border-border/30';
    const bgClass = getBackgroundColorClass(intensity, isHoliday);
    return cn(baseClasses, bgClass);
  }, [intensity, isHoliday]);

  const textClassName = useMemo(() => {
    const baseClass = 'text-[0.6rem] font-medium';
    const colorClass = getTextColorClass(intensity);
    return cn(baseClass, colorClass);
  }, [intensity]);

  return { containerClassName, textClassName };
}

function buildTooltipText(
  yearMonthDay: string,
  isHoliday: boolean,
  holidayName?: string,
): string {
  let text = yearMonthDay;
  if (isHoliday && holidayName) text += ` (${holidayName})`;
  return text;
}

function ContributionItemInner({ contribution, value, maxValue }: ContributionItemProps) {
  const { intensity, yearMonthDay, day, isHoliday, holidayName } =
    useContributionMeta(contribution, value, maxValue);

  const { containerClassName, textClassName } = useContributionClasses(intensity, isHoliday);

  const tooltipText = buildTooltipText(yearMonthDay, isHoliday, holidayName);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={containerClassName}>
            <span className={textClassName}>{day}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className='text-xs'>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const ContributionItem = memo(ContributionItemInner);
