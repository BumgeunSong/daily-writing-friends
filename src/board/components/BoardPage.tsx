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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">게시판을 찾을 수 없습니다.</h1>
          <p className="mt-4 text-lg text-muted-foreground">존재하지 않는 게시판이거나 잘못된 경로입니다.</p>
          <Button onClick={() => navigate("/")} className="mt-6 rounded-lg">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen notebook-gradient">
      <BoardPageHeader boardId={boardId} />
      <main className="container mx-auto px-4 py-4 pb-24 bg-background">
        <div className="rounded-2xl bg-card/80 notebook-shadow backdrop-blur-sm p-4">
          <PostCardList boardId={boardId!} onPostClick={handlePostClick} onClickProfile={handleProfileClick} />
        </div>
      </main>
      <WritingActionButton boardId={boardId} />
    </div>
  )
}
