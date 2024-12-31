import { useMemo } from "react"
import { Contribution } from "@/types/WritingStats"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import processContributions from "@/utils/contributionUtils"
interface ContributionGraphProps {
    contributions: Contribution[]
    className?: string
}

export function ContributionGraph({ contributions, className }: ContributionGraphProps) {
    // 분리된 함수를 useMemo에서 호출
    const { matrix, maxValue, recentContributions } = useMemo(
        () => processContributions(contributions),
        [contributions]
    );

    return (
        <div className={cn("w-full grid grid-rows-4 grid-flow-col gap-1", className)}>
            {matrix.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                    {row.map((value, colIndex) => {
                        const contributionIndex = rowIndex * 5 + colIndex;
                        const contribution = recentContributions[contributionIndex];
                        const intensity = !value ? 0 : Math.ceil((value / maxValue) * 4);
                        const date = contribution?.date;
                        const day = date ? new Date(date).getDate() : '';

                        return (
                            <TooltipProvider key={colIndex}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "aspect-square w-full rounded-sm relative flex items-center justify-center",
                                                intensity === 0 && "bg-gray-100",
                                                intensity === 1 && "bg-green-300",
                                                intensity === 2 && "bg-green-500",
                                                intensity === 3 && "bg-green-700",
                                                intensity === 4 && "bg-green-900"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[0.6rem] font-medium",
                                                intensity >= 2 ? "text-white/90" : "text-foreground/60"
                                            )}>
                                                {day}
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs">
                                            {date}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
  