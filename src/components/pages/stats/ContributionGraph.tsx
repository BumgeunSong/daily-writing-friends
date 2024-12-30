import { Contribution } from "@/types/WritingStats"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ContributionGraphProps {
    contributions: Contribution[]
    className?: string
  }
  
export function ContributionGraph({ contributions, className }: ContributionGraphProps) {
    // Create a 5x4 matrix for the last 20 days
    const matrix: (number | null)[][] = Array(5).fill(0).map(() => Array(4).fill(null))
    
    // Fill the matrix with contribution data
    contributions.slice(-20).forEach((contribution, index) => {
        const row = Math.floor(index / 4)
        const col = index % 5
        matrix[row][col] = contribution.contentLength
    })
  
    // Calculate max value for intensity
    const maxValue = Math.max(...contributions.map(c => c.contentLength || 0))
  
    return (
        <div className={cn("w-full grid grid-cols-5 gap-1", className)}>
            {matrix.map((row, rowIndex) => (
                <div key={rowIndex} className="flex flex-col gap-1">
                    {row.map((value, colIndex) => {
                        const intensity = !value ? 0 : Math.ceil((value / maxValue) * 4)
                        const date = contributions[rowIndex * 5 + colIndex]?.date
                        
                        return (
                            <TooltipProvider key={colIndex}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                "aspect-square w-full rounded-sm",
                                                intensity === 0 && "bg-green-100",
                                                intensity === 1 && "bg-green-300",
                                                intensity === 2 && "bg-green-500",
                                                intensity === 3 && "bg-green-700",
                                                intensity === 4 && "bg-green-900"
                                            )}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="text-xs">
                                            {date}: {value === null ? 'No writing' : `${value} characters`}
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
  