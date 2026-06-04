import { Info } from "lucide-react"
import { useRemoteConfig } from "@/shared/hooks/useRemoteConfig"
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Skeleton } from '@/shared/ui/skeleton'

export function StatsNoticeBanner() {
    const {
        value: bannerText,
        isPlaceholderData: isResolving,
        error,
    } = useRemoteConfig('stats_notice_banner_text');

    const hasBannerText = bannerText.trim().length > 0;
    const reserveBannerSlot = isResolving || hasBannerText;

    if (error || !reserveBannerSlot) {
        return null;
    }

    return (
        <Alert className="mb-4 bg-muted/50">
            <div className="flex items-center gap-2">
                <Info className="size-4 shrink-0" />
                <AlertDescription className="text-sm text-muted-foreground">
                    {isResolving ? <Skeleton className="h-4 w-full" /> : bannerText}
                </AlertDescription>
            </div>
        </Alert>
    )
}