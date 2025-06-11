"use client"

import { useParams, useNavigate } from "react-router-dom"
import { Button } from "@/shared/ui/button"
import { BoardPageHeader } from "@/board/components/BoardPageHeader"
import PostCardList from "@/board/components/PostCardList"
import { WritingActionButton } from "@/board/components/WritingActionButton"

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()

  const handlePostClick = (postId: string) => {
    navigate(`/board/${boardId}/post/${postId}`)
  }

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`)
  }

  if (!boardId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-3 md:px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-destructive md:text-2xl">게시판을 찾을 수 없습니다.</h1>
          <p className="mt-4 text-base text-muted-foreground md:text-lg">존재하지 않는 게시판이거나 잘못된 경로입니다.</p>
          <Button 
            onClick={() => navigate("/")} 
            className="mt-6 h-11 min-w-[44px] rounded-lg reading-hover reading-focus transition-all duration-200 active:scale-[0.99] md:h-10"
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <BoardPageHeader boardId={boardId} />
      <main className="container mx-auto px-3 py-4 pb-24 md:px-4 md:py-6">
        <PostCardList boardId={boardId!} onPostClick={handlePostClick} onClickProfile={handleProfileClick} />
      </main>
      <WritingActionButton boardId={boardId} />
    </div>
  )
}
