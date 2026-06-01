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
  const { data: title, error } = useQuery(
    ["boardTitle", boardId],
    () => fetchBoardTitle(boardId || ""),
    { enabled: !!boardId },
  )

  if (error) {
    return <StatusMessage error errorMessage="타이틀을 불러오는 중에 문제가 생겼어요." />
  }

  // Render the header immediately with reserved text height (  preserves the
  // baseline) so the post list below does not shift when title arrives, and
  // BoardPage paint is not gated on fetchBoardTitle.
  return (
    <header className="bg-background pb-1 pt-3">
      <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
        <Link
          to="/boards/list"
          className="reading-hover reading-focus flex min-h-[44px] items-center space-x-2 rounded-lg p-2 text-foreground transition-[transform,background-color] duration-200 active:scale-[0.99]"
        >
          <span className="text-xl font-semibold tracking-tight md:text-2xl">{title || " "}</span>
          <ChevronDown className="size-4 md:size-5" />
        </Link>
      </div>
    </header>
  )
}
