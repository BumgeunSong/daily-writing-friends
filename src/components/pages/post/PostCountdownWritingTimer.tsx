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
    return expired ? "bg-green-500" : "bg-blue-500"
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-white border-b shadow-md dark:bg-gray-900 dark:border-gray-800">
      <div className="w-full px-4 py-3 mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-lg font-medium">{formatTime(timeLeft)}</span>
          </div>
          <div className={`px-2 py-1 text-xs font-medium rounded-full ${
            expired 
              ? "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300" 
              : "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300"
          }`}>
            {expired ? "프리라이팅 성공!" : status === WritingStatus.Writing ? "쓰는 중..." : "일시정지"}
          </div>
        </div>

        <div className="w-full h-2 bg-gray-100 rounded-full dark:bg-gray-800">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${getColorClass()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
