import { CalendarDays, Clock, PenLine, AlignLeft, Sparkles, MessageCircle } from "lucide-react"
import { Card } from "@/shared/ui/card"
import type React from "react"
import { Board } from "@/board/model/Board"

interface CohortDetailsCardProps {
  upcomingBoard?: Board | null
}

const CohortDetailsCard: React.FC<CohortDetailsCardProps> = ({ upcomingBoard }) => (
  <Card className="relative space-y-4 bg-muted/30 p-6 md:h-full">
    <div className="absolute -top-3 left-6">
      <div className="flex items-center gap-1 rounded-full bg-black px-3 py-1 text-white shadow-md">
        <Sparkles className="size-4" />
        <span className="text-sm font-medium">곧 시작해요</span>
      </div>
    </div>

    <div className="mb-2 mt-4">
      <h3 className="text-lg font-bold md:text-xl">매일 글쓰기 프렌즈 {upcomingBoard?.cohort || "N"}기</h3>
    </div>

    <div className="space-y-3 md:space-y-4">
      {upcomingBoard && upcomingBoard.firstDay && upcomingBoard.lastDay && (
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-muted-foreground" />
          <p className="md:text-lg">{upcomingBoard.firstDay.toDate().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} - {upcomingBoard.lastDay.toDate().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Clock className="size-5 text-muted-foreground" />
        <p className="md:text-lg">4주간</p>
      </div>

      <div className="flex items-center gap-2">
        <PenLine className="size-5 text-muted-foreground" />
        <p className="md:text-lg">총 20개의 글</p>
      </div>

      <div className="flex items-center gap-2">
        <AlignLeft className="size-5 text-muted-foreground" />
        <p className="md:text-lg">글 최소 분량 3줄</p>
      </div>
      <div className="flex items-center gap-2">
        <MessageCircle className="size-5 text-muted-foreground" />
        <p className="md:text-lg">하루에 댓글 1개 달기</p>
      </div>
    </div>
  </Card>
)

export default CohortDetailsCard
