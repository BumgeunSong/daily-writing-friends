import * as React from "react"
import { useParams } from "react-router-dom"
import { useAuth } from "@/shared/hooks/useAuth"
import { TopicCardCarouselContainer } from "@/shared/components/TopicCardCarouselContainer"
import { TopicCard } from "../model/TopicCard"
import { Skeleton } from "@/shared/ui/skeleton"
import { Timestamp } from "firebase/firestore"

// TODO: 실제 Firestore fetch로 대체
async function fetchTopicCards(boardId: string): Promise<TopicCard[]> {
  // 임시: 목업 데이터
  return [
    { id: "1", title: "오늘의 감사한 일", description: "오늘 감사했던 일을 적어보세요.", createdAt: Timestamp.now(), createdBy: "admin" },
    { id: "2", title: "최근 읽은 책", description: "최근 읽은 책에 대해 소개해 주세요.", createdAt: Timestamp.now(), createdBy: "admin" },
    { id: "3", title: "나만의 루틴", description: "매일 실천하는 루틴이 있나요?", createdAt: Timestamp.now(), createdBy: "admin" },
  ]
}

export default function TopicCardCarouselPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const { currentUser } = useAuth()
  const [topicCards, setTopicCards] = React.useState<TopicCard[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isError, setIsError] = React.useState(false)

  React.useEffect(() => {
    if (!boardId) return
    setIsLoading(true)
    fetchTopicCards(boardId)
      .then(setTopicCards)
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [boardId])

  if (!boardId) {
    return <div className="p-8 text-center text-red-500">잘못된 접근입니다.</div>
  }
  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-40 w-full rounded-2xl mb-4" /><Skeleton className="h-40 w-full rounded-2xl" /></div>
  }
  if (isError) {
    return <div className="p-8 text-center text-red-500">글감 정보를 불러오지 못했습니다.</div>
  }
  if (!topicCards.length) {
    return <div className="p-8 text-center text-gray-500">아직 등록된 글감이 없습니다.</div>
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 pt-6 pb-2">
        <h1 className="text-xl font-bold text-primary mb-1">글감 목록</h1>
        <p className="text-sm text-muted-foreground">글쓰기가 막막할 때, 다양한 글감을 참고해 보세요.</p>
      </header>
      <main className="flex-1 flex flex-col items-center justify-start px-2 pb-8">
        {currentUser && (
          <TopicCardCarouselContainer
            userId={currentUser.uid}
            topicCards={topicCards}
            className="w-full max-w-lg mx-auto"
          />
        )}
      </main>
    </div>
  )
} 