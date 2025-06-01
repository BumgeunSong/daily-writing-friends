import * as React from "react"
import { TopicCardCarousel } from "./TopicCardCarousel"
import { useTopicCardStates } from "../../board/hooks/useTopicCardStates"
import { TopicCard } from "../../board/model/TopicCard"
import { toast } from "sonner"
import { type CarouselApi } from "@/shared/ui/Carousel"
import { useNavigate, useParams } from "react-router-dom"
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"

interface TopicCardCarouselContainerProps {
  userId: string
  topicCards: TopicCard[]
  className?: string
}

// 개선된 Skeleton 컴포넌트
const TopicCardSkeleton: React.FC = () => (
  <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col justify-between items-center h-[420px] sm:h-[480px] min-h-[420px] sm:min-h-[480px] w-full max-w-[360px] mx-auto p-6 animate-pulse overflow-hidden">
    {/* 액션 버튼 자리 */}
    <div className="absolute top-3 right-3 flex gap-2 z-10">
      <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800" />
      <div className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800" />
    </div>
    {/* Quote 아이콘 자리 */}
    <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 mb-2" />
    {/* 타이틀/설명 자리 */}
    <div className="flex-1 flex flex-col items-center justify-center w-full">
      <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3 mb-2" />
      <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full mb-1" />
      <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-5/6 mb-1" />
      <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
    </div>
    {/* CTA 버튼 자리 */}
    <div className="mt-6 h-11 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
  </div>
)

export const TopicCardCarouselContainer: React.FC<TopicCardCarouselContainerProps> = ({ userId, topicCards, className }) => {
  const {
    cardStates,
    toggleBookmark,
    toggleHide,
    isLoading,
    isError,
    isBookmarking,
    isHiding,
  } = useTopicCardStates(userId, topicCards)

  // Embla API ref
  const carouselApiRef = React.useRef<CarouselApi | null>(null)
  const navigate = useNavigate()
  const { boardId } = useParams<{ boardId: string }>()

  // 북마크/숨김된 카드는 제외, 북마크 정렬은 최초 마운트/새로고침 시에만 적용
  const visibleCards = React.useMemo(() => {
    return topicCards
      .filter((card) => !cardStates[card.id]?.deleted)
      .sort((a, b) => {
        const aBookmarked = !!cardStates[a.id]?.bookmarked
        const bBookmarked = !!cardStates[b.id]?.bookmarked
        if (aBookmarked === bBookmarked) return 0
        return aBookmarked ? -1 : 1
      })
  }, [topicCards /* cardStates 제거로 즉시 정렬 방지 */])

  // 북마크 클릭 핸들러
  const handleBookmarkClick = (topicId: string) => {
    toggleBookmark(topicId)
    toast("북마크한 글감은 다음부터 먼저 보여드릴게요.")
  }

  // 숨김 클릭 핸들러
  const handleHideClick = (topicId: string) => {
    toggleHide(topicId)
    // 숨김 후 자동 다음 카드로 이동
    if (carouselApiRef.current) {
      carouselApiRef.current.scrollNext()
    }
  }

  // 글쓰기 시작(CTA) 클릭 시 이동
  const handleStartWriting = (card: TopicCard) => {
    if (!boardId) return
    sendAnalyticsEvent(AnalyticsEvent.FINISH_TOPIC_CARD, { boardId })
    navigate(`/create/${boardId}?title=${encodeURIComponent(card.title)}&content=${encodeURIComponent(card.description)}`)
  }

  if (isLoading) {
    // Skeleton 3개 표시
    return (
      <div className={className + " flex-1 flex flex-col justify-center items-center min-h-[calc(100vh-80px)]"}>
        <div className="flex gap-4 overflow-x-auto">
          <TopicCardSkeleton />
          <TopicCardSkeleton />
          <TopicCardSkeleton />
        </div>
      </div>
    )
  }

  if (isError) {
    // 에러 메시지 카드
    return (
      <div className={className + " flex-1 flex flex-col justify-center items-center min-h-[calc(100vh-80px)]"}>
        <div className="max-w-[90vw] sm:max-w-xs md:max-w-sm lg:max-w-md bg-red-50 border border-red-200 rounded-2xl shadow-md p-4 h-[180px] flex items-center justify-center text-red-600">
          글감 정보를 불러오지 못했습니다. 새로고침 해주세요.
        </div>
      </div>
    )
  }

  return (
    <div className={className + " flex-1 flex flex-col justify-center items-center min-h-[calc(100vh-80px)]"}>
      <TopicCardCarousel
        topicCards={visibleCards}
        cardStates={cardStates}
        onBookmarkClick={handleBookmarkClick}
        onHideClick={handleHideClick}
        isBookmarking={isBookmarking}
        isHiding={isHiding}
        setCarouselApi={(api: CarouselApi) => (carouselApiRef.current = api)}
        onStartWriting={handleStartWriting}
      />
    </div>
  )
} 