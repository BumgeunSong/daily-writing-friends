import { useEffect, useState } from "react"
import { useInterval } from "@/post/hooks/useInterval"
import { cn } from "@/shared/utils/cn"
import { WritingStatus } from "@/stats/model/WritingStatus"

interface CountupWritingTimerProps {
  /**
   * Whether the timer is currently active
   */
  status: WritingStatus
  /**
   * Whether the target time has been reached
   */
  reached: boolean
  /**
   * Callback function when target time is reached
   */
  onReach: () => void
  /**
   * Target time in seconds (default: 5 minutes)
   */
  targetTime?: number
}

export default function CountupWritingTimer({
  status,
  reached,
  onReach,
  targetTime = 5 * 60, // 5 minutes in seconds
}: CountupWritingTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // 컴포넌트가 마운트될 때 타이머를 초기화
  useEffect(() => {
    setElapsedTime(0)
  }, [])

  const delay = status === WritingStatus.Writing ? 1000 : null

  useInterval(() => {
    setElapsedTime((prevTime) => {
      const newTime = prevTime + 1
      // 목표 시간에 도달했을 때 콜백 호출
      if (newTime >= targetTime && !reached) {
        onReach()
      }
      return newTime
    })
  }, delay)

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
        {reached ? "완료" : status === WritingStatus.Writing ? "쓰는 중" : "일시정지"}
      </div>
    </div>
  )
}
