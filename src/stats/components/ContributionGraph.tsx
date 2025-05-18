import { useMemo } from "react"
import { cn } from "@/shared/utils/cn"
import { ContributionItem } from "@/stats/components/ContributionItem"
import { Contribution } from "@/stats/model/WritingStats"
import processContributions from "@/stats/utils/contributionUtils"
interface ContributionGraphProps {
    contributions: Contribution[]
    className?: string
}
export function ContributionGraph({ contributions, className }: ContributionGraphProps) {
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
                        return (
                            <ContributionItem
                                key={colIndex}
                                contribution={contribution}
                                value={value}
                                maxValue={maxValue}
                            />
                        );
                    })}
                </div>
            ))}
        </div>
    );
}