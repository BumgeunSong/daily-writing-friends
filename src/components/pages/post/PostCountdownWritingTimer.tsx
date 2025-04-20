import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { WritingStatus } from "@/types/WritingStatus"
import { useInterval } from "@/hooks/useInterval"

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
    setElapsedTime(0);
  }, []);

  const delay = status === WritingStatus.Writing ? 1000 : null;

  useInterval(() => {
    setElapsedTime((prevTime) => {
      const newTime = prevTime + 1;
      // 목표 시간에 도달했을 때 콜백 호출
      if (newTime >= targetTime && !reached) {
        onReach();
      }
      return newTime;
    });
  }, delay);

  return (
    <div className="sticky top-0 z-50 w-full bg-white border-b shadow-md dark:bg-gray-900 dark:border-gray-800">
      <div className="w-full px-4 py-3 mx-auto max-w-7xl">
        {/* 프리라이팅 모드 제목과 부제목 */}
        <div className="mb-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">프리라이팅 모드</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            이 글은 다른 사람에게 보여지지 않아요. 자유롭게 떠오르는 생각들을 써내려가보세요.
          </p>
        </div>
        
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-lg font-medium">{formatTime(elapsedTime)}</span>
            <span className="text-sm text-gray-500">/ {formatTime(targetTime)}</span>
          </div>
          <div className={`px-2 py-1 text-xs font-medium rounded-full ${
            reached 
              ? "text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-300" 
              : "text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300"
          }`}>
            {reached ? "프리라이팅 성공!" : status === WritingStatus.Writing ? "쓰는 중..." : "일시정지"}
          </div>
        </div>
      </div>
    </div>
  )
}
