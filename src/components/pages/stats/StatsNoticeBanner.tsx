import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

export function StatsNoticeBanner() {
    return (
        <Alert className="mb-4 bg-muted/50">
            <div className="flex items-center gap-2"> 
                <Info className="h-4 w-4 flex-shrink-0" />
                <AlertDescription className="text-sm text-muted-foreground">
                        연속 일자가 높을수록 기록이 위에 보여요.
                </AlertDescription>
            </div>
        </Alert>
    )
}