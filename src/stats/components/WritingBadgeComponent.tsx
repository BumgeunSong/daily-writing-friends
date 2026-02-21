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
            className="inline-flex items-center gap-1 rounded-md bg-muted/20 px-1.5 py-0.5 border-0"
        >
            <span className="text-sm leading-none">{badge.emoji}</span>
            <span className="text-sm font-normal leading-none text-foreground/70">
                {badge.name}
            </span>
        </Badge>
    )
}