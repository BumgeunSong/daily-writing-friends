import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { WritingStatus } from "@/types/WritingStatus"

interface CountdownWritingTimerProps {
  /**
   * Whether the countdown is currently active
   */
  status: WritingStatus
  /**
   * Whether the countdown has expired
   */
  expired: boolean
  /**
   * Callback function when the countdown expires
   */
  onExpire: () => void
  /**
   * Total time in seconds (default: 5 minutes)
   */
  totalTime?: number
}

export default function CountdownWritingTimer({
    status,
  expired,
  onExpire,
  totalTime = 5 * 60, // 5 minutes in seconds
}: CountdownWritingTimerProps) {
  const [timeLeft, setTimeLeft] = useState(totalTime)
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null)

  // Calculate progress percentage
  const progress = (timeLeft / totalTime) * 100

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  useEffect(() => {
    // Reset timer if stop is toggled to true
    if (status === WritingStatus.Paused) {
      setTimeLeft(totalTime)
      setLastUpdateTime(null)
      return
    }

    // Don't run the timer if not in "writing" state or already expired
    if (status === WritingStatus.Writing || expired) {
      setLastUpdateTime(null)
      return
    }

    // Set the initial update time when starting
    if (lastUpdateTime === null) {
      setLastUpdateTime(Date.now())
    }

    const timer = setInterval(() => {
      if (status === WritingStatus.Writing) {
        setTimeLeft((prevTime) => {
          const newTime = Math.max(0, prevTime - 1)

          // Check if timer has expired
          if (newTime === 0 && prevTime !== 0) {
            onExpire()
          }

          return newTime
        })
        setLastUpdateTime(Date.now())
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [status, expired, onExpire, totalTime, lastUpdateTime])

  const getColorClass = () => {
    return "bg-blue-500"
  }

  return (
    <div className="sticky top-0 z-10 w-full bg-white border-b shadow-sm dark:bg-gray-900 dark:border-gray-800">
      <div className="container px-4 py-2 mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="font-medium">{`${formatTime(timeLeft)}`}</span>
          </div>
          <div className="text-xs text-gray-500">
            {expired ? "성공" : status === WritingStatus.Writing ? "쓰는 중..." : "일시정지"}
          </div>
        </div>

        <div className="w-full h-2 mt-2 bg-gray-200 rounded-full dark:bg-gray-700">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${getColorClass()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
