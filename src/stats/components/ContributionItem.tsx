import { memo, useMemo } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip"
import { cn } from "@/shared/utils/cn"
import { Contribution } from "@/stats/model/WritingStats"
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils'

// Contribution | CommentingContribution 모두 지원
interface ContributionItemProps {
    contribution?: Contribution | CommentingContribution
    value: number | null
    maxValue: number
}

function ContributionItemInner({ contribution, value, maxValue }: ContributionItemProps) {
    // Memoize expensive calculations
    const { intensity, yearMonthDay, day } = useMemo(() => {
        // Calculate color intensity (0-4) based on contribution value relative to max
        const intensity = !value ? 0 : Math.ceil((value / Math.max(maxValue, 1)) * 4);
        
        // Extract date information for display and tooltip
        const createdAt = contribution?.createdAt;
        const yearMonthDay = createdAt ? new Date(createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
        const day = createdAt ? new Date(createdAt).getDate().toString() : '';
        
        return { intensity, yearMonthDay, day };
    }, [contribution?.createdAt, value, maxValue]);

    // Memoize className calculations
    const containerClassName = useMemo(() => cn(
        "aspect-square w-full rounded-sm relative flex items-center justify-center border border-border/30",
        // Apply background colors based on contribution intensity (GitHub-style)
        intensity === 0 && "bg-muted/50",
        intensity === 1 && "bg-green-200 dark:bg-green-800/60",
        intensity === 2 && "bg-green-400 dark:bg-green-600/70",
        intensity === 3 && "bg-green-600 dark:bg-green-500/80",
        intensity === 4 && "bg-green-800 dark:bg-green-400"
    ), [intensity]);

    const textClassName = useMemo(() => cn(
        "text-[0.6rem] font-medium",
        // Use white text for high intensity items for better contrast
        intensity >= 3 ? "text-white" : "text-muted-foreground"
    ), [intensity]);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={containerClassName}>
                        <span className={textClassName}>
                            {day}
                        </span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-xs">
                        {yearMonthDay}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// Memoize the component to prevent unnecessary re-renders
export const ContributionItem = memo(ContributionItemInner);