import { useEffect } from "react"
import { ErrorBoundary } from "@/shared/components/ErrorBoundary"
import { useAuth } from "@/shared/hooks/useAuth"
import { Skeleton } from "@/shared/ui/skeleton"
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { TopicCardCarouselContainer } from "./TopicCardCarouselContainer"
import { useAllTopicCards } from "../hooks/useAllTopicCards"

function TopicCardCarouselContent() {
  const { currentUser } = useAuth()
  const { data: topicCards = [], isLoading, isError, error } = useAllTopicCards()

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">로그인이 필요합니다.</div>
  }
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Skeleton className="mb-4 h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }
  if (isError) {
    return <div className="p-8 text-center text-red-500">글감 정보를 불러오지 못했습니다.<br />{error instanceof Error ? error.message : null}</div>
  }
  if (!topicCards.length) {
    return <div className="p-8 text-center text-gray-500">아직 등록된 글감이 없습니다.</div>
  }
  return (
    <TopicCardCarouselContainer
      userId={currentUser.uid}
      topicCards={topicCards}
      className="flex size-full flex-1 flex-col items-center justify-center"
    />
  )
}

export default function TopicCardCarouselPage() {
  
  useEffect(() => {
    sendAnalyticsEvent(AnalyticsEvent.START_TOPIC_CARD)
  }, [])

  return (
    <div className="flex size-full min-h-0 flex-col bg-background">
      <ErrorBoundary fallback={<div className="p-8 text-center text-red-500">글감 정보를 불러오지 못했습니다.</div>}>
        <TopicCardCarouselContent />
      </ErrorBoundary>
    </div>
  )
}