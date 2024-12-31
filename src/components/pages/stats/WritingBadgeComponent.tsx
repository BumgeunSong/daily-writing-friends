import { WritingBadge } from "@/types/WritingStats"
import { Badge } from "@/components/ui/badge"

export interface WritingBadgeComponentProps {
    badge: WritingBadge
}

export function WritingBadgeComponent({ badge }: WritingBadgeComponentProps) {
    return (
        <Badge 
            id={badge.name} 
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 rounded-full"
        >
            <span className="text-xs leading-none">{badge.emoji}</span>
            <span className="text-xs font-normal leading-none">
                {badge.name}
            </span>
        </Badge>
    )
}