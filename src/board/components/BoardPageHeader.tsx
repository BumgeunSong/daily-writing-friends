import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import type React from "react"
import { Link } from "react-router-dom"
import { fetchBoardTitle } from "@/board/utils/boardUtils"
import StatusMessage from "@/shared/components/StatusMessage"

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
    <header className="bg-card py-3">
      <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
        <Link
          to="/boards/list"
          className="flex items-center space-x-2 rounded-lg p-2 min-h-[44px] reading-hover reading-focus text-foreground transition-all duration-200 active:scale-[0.99]"
        >
          <span className="text-xl font-semibold tracking-tight md:text-2xl">{title || "타이틀 없음"}</span>
          <ChevronDown className="size-4 md:size-5" />
        </Link>
      </div>
    </header>
  )
}
