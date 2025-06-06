import { Info } from "lucide-react"
import { useRemoteConfig } from "@/shared/contexts/RemoteConfigContext"
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Skeleton } from '@/shared/ui/skeleton'

export function StatsNoticeBanner() {
    // Remote Config에서 배너 텍스트 가져오기
    const { 
        value: bannerText, 
        isLoading, 
        error 
    } = useRemoteConfig('stats_notice_banner_text');
    
    // 배너 표시 여부 결정
    const shouldShowBanner = !error && (isLoading || bannerText.trim().length > 0);
    
    if (!shouldShowBanner) {
        return null; // 오류가 있거나 텍스트가 비어있으면 배너를 표시하지 않음
    }
    
    return (
        <Alert className="mb-4 bg-muted/50">
            <div className="flex items-center gap-2"> 
                <Info className="size-4 shrink-0" />
                <AlertDescription className="text-sm text-muted-foreground">
                    {isLoading ? (
                        <Skeleton className="h-4 w-full" />
                    ) : (
                        bannerText
                    )}
                </AlertDescription>
            </div>
        </Alert>
    )
}