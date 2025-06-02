import { useAuth } from "@/shared/hooks/useAuth"
import { Skeleton } from "@/shared/ui/skeleton"
import { ErrorBoundary } from "@/shared/components/ErrorBoundary"
import { TopicCardCarouselContainer } from "./TopicCardCarouselContainer"
import { useAllTopicCards } from "../hooks/useAllTopicCards"
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { useEffect } from "react"

function TopicCardCarouselContent() {
  const { currentUser } = useAuth()
  const { data: topicCards = [], isLoading, isError, error } = useAllTopicCards()

  if (!currentUser) {
    return <div className="p-8 text-center text-gray-500">로그인이 필요합니다.</div>
  }
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Skeleton className="h-40 w-full rounded-2xl mb-4" />
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
      className="w-full h-full flex-1 flex flex-col justify-center items-center"
    />
  )
}

export default function TopicCardCarouselPage() {
  
  useEffect(() => {
    sendAnalyticsEvent(AnalyticsEvent.START_TOPIC_CARD)
  }, [])

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-background">
      <ErrorBoundary fallback={<div className="p-8 text-center text-red-500">글감 정보를 불러오지 못했습니다.</div>}>
        <TopicCardCarouselContent />
      </ErrorBoundary>
    </div>
  )
}