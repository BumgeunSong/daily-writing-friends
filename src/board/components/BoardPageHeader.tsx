import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import { Link } from "react-router-dom"
import { fetchBoardTitle } from "@/board/utils/boardUtils"
import StatusMessage from "@/shared/components/StatusMessage"
import type React from "react"

interface BoardHeaderProps {
  boardId?: string
}

export const BoardPageHeader: React.FC<BoardHeaderProps> = ({ boardId }) => {
  const {
    data: title,
    isLoading,
    error,
  } = useQuery(["boardTitle", boardId], () => fetchBoardTitle(boardId || ""), {
    enabled: !!boardId, // boardId가 있을 때만 쿼리 실행
  })

  if (isLoading) {
    return <StatusMessage isLoading loadingMessage="타이틀을 불러오는 중..." />
  }

  if (error) {
    return <StatusMessage error errorMessage="타이틀을 불러오는 중에 문제가 생겼어요." />
  }

  return (
    <header className="bg-background pt-3 pb-1">
      <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
        <Link
          to="/boards/list"
          className="reading-hover reading-focus flex min-h-[44px] items-center space-x-2 rounded-lg p-2 text-foreground transition-all duration-200 active:scale-[0.99]"
        >
          <span className="text-xl font-semibold tracking-tight md:text-2xl">{title || "타이틀 없음"}</span>
          <ChevronDown className="size-4 md:size-5" />
        </Link>
      </div>
    </header>
  )
}
