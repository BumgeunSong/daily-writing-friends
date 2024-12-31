import { WritingBadge } from "@/types/WritingStats"
import { Badge } from "@/components/ui/badge"

export interface WritingBadgeComponentProps {
    badge: WritingBadge
}

export function WritingBadgeComponent({ badge }: WritingBadgeComponentProps) {
    return (
        <Badge id={badge.name}>
            <span>{badge.emoji}</span>
            <span>{badge.name}</span>
        </Badge>
    )
}