import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Contribution } from "@/types/WritingStats"

interface ContributionItemProps {
    contribution?: Contribution
    value: number | null
    maxValue: number
}

export function ContributionItem({ contribution, value, maxValue }: ContributionItemProps) {
    const intensity = !value ? 0 : Math.ceil((value / maxValue) * 4);
    const date = contribution?.date;
    const day = date ? new Date(date).getDate() : '';

    return (
        <TooltipProvider>
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
}