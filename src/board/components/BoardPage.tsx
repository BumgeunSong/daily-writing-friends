"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import BestPostCardList from "@/board/components/BestPostCardList"
import { BoardPageHeader } from "@/board/components/BoardPageHeader"
import PostFilterTabs, { type PostFilterType } from "@/board/components/PostFilterTabs"
import RecentPostCardList from "@/board/components/RecentPostCardList"
import { WritingActionButton } from "@/board/components/WritingActionButton"
import { Button } from "@/shared/ui/button"

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()

  const [filter, setFilter] = useState<PostFilterType>(() => {
    if (!boardId) return 'recent';
    const saved = sessionStorage.getItem(`boardFilter-${boardId}`);
    return (saved === 'best' || saved === 'recent') ? saved : 'recent';
  });

  useEffect(() => {
    if (boardId) {
      sessionStorage.setItem(`boardFilter-${boardId}`, filter);
    }
  }, [filter, boardId]);

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
            className="reading-hover reading-focus mt-6 h-11 min-w-[44px] rounded-lg transition-all duration-200 active:scale-[0.99] md:h-10"
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
      <main className="container mx-auto px-3 py-2 pb-24 md:px-4">
        <div className="mb-4">
          <PostFilterTabs selected={filter} onChange={setFilter} />
        </div>
        {filter === 'recent' ? (
          <RecentPostCardList boardId={boardId} onPostClick={handlePostClick} onClickProfile={handleProfileClick} />
        ) : (
          <BestPostCardList boardId={boardId} onPostClick={handlePostClick} onClickProfile={handleProfileClick} />
        )}
      </main>
      <WritingActionButton boardId={boardId} />
    </div>
  )
}
