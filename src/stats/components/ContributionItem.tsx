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

export function ContributionItem({ contribution, value, maxValue }: ContributionItemProps) {
    const intensity = !value ? 0 : Math.ceil((value / maxValue) * 4);
    const createdAt = contribution?.createdAt;
    const yearMonthDay = createdAt ? new Date(createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
    const day = createdAt ? new Date(createdAt).getDate().toString() : '';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "aspect-square w-full rounded-sm relative flex items-center justify-center border border-border/30",
                            intensity === 0 && "bg-muted/50",
                            intensity === 1 && "bg-green-200 dark:bg-green-900/40",
                            intensity === 2 && "bg-green-400 dark:bg-green-700/60",
                            intensity === 3 && "bg-green-600 dark:bg-green-600/80",
                            intensity === 4 && "bg-green-800 dark:bg-green-500"
                        )}
                    >
                        <span className={cn(
                            "text-[0.6rem] font-medium",
                            intensity >= 3 ? "text-white" : "text-muted-foreground"
                        )}>
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