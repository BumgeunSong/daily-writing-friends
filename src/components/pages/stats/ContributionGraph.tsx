
import { Contribution } from "@/types/WritingStats"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"

interface ContributionGraphProps {
    contributions: Contribution[]
    className?: string
}

export function ContributionGraph({ contributions, className }: ContributionGraphProps) {
    // Create a 4x5 matrix for the last 20 days
    const matrix: (number | null)[][] = Array(4).fill(0).map(() => Array(5).fill(null))

    // Fill the matrix with contribution data
    contributions.slice(-20).forEach((contribution, index) => {
        const row = Math.floor(index / 5)
        const col = index % 5
        matrix[row][col] = contribution.contentLength
    })

    // Calculate max value for intensity
    const maxValue = Math.max(...contributions.map(c => c.contentLength || 0))

    return (
        <div className={cn("flex gap-1", className)}>
            {matrix.map((row, rowIndex) => (
                <div key={rowIndex} className="flex flex-col gap-1">
                    {row.map((value, colIndex) => {
                        const intensity = !value ? 0 : Math.ceil((value / maxValue) * 4)
                        const date = contributions[rowIndex * 5 + colIndex]?.date

                        return (
                            <TooltipProvider key={colIndex}>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div
                                            className={cn(
                                                "h-4 w-4 rounded-sm",
                                                intensity === 0 && "bg-muted",
                                                intensity === 1 && "bg-primary/30",
                                                intensity === 2 && "bg-primary/50",
                                                intensity === 3 && "bg-primary/70",
                                                intensity === 4 && "bg-primary"
                                            )}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs">
                                            {date}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )
                    })}
                </div>
            ))}
        </div>
    )
}

