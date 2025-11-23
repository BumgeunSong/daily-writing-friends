import { Badge } from "@/shared/ui/badge"
import { WritingBadge } from "@/stats/model/WritingStats"

export interface WritingBadgeComponentProps {
    badge: WritingBadge
}

export function WritingBadgeComponent({ badge }: WritingBadgeComponentProps) {
    return (
        <Badge 
            id={badge.name} 
            variant="secondary"
            className="flex items-center gap-1 rounded-full border-border/30 bg-secondary/80 px-2 py-0.5 text-muted-foreground"
        >
            <span className="text-xs leading-none">{badge.emoji}</span>
            <span className="text-xs font-normal leading-none">
                {badge.name}
            </span>
        </Badge>
    )
}