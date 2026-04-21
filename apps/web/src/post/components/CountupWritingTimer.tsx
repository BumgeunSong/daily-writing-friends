import { cn } from "@/shared/utils/cn"
import { WritingStatus } from "@/stats/model/WritingStatus"
import { formatTime } from "@/post/utils/timerUtils"
import { useCountupTimer } from "@/post/hooks/useCountupTimer"

interface CountupWritingTimerProps {
  status: WritingStatus
  reached: boolean
  onReach: () => void
  targetTime?: number
}

export default function CountupWritingTimer({
  status,
  reached,
  onReach,
  targetTime = 5 * 60,
}: CountupWritingTimerProps) {
  const { elapsedTime } = useCountupTimer({ targetTime, status, onReach, reached })

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium tabular-nums">
        {formatTime(elapsedTime)} / {formatTime(targetTime)}
      </span>

      <div
        className={cn(
          "rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap",
          reached
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
            : status === WritingStatus.Writing
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        )}
      >
        {reached && "완료"}
        {!reached && status === WritingStatus.Writing && "쓰는 중"}
        {!reached && status !== WritingStatus.Writing && "일시정지"}
      </div>
    </div>
  )
}
