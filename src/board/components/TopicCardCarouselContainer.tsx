import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { type CarouselApi } from "@/shared/ui/Carousel"
import { AnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { sendAnalyticsEvent } from "@/shared/utils/analyticsUtils"
import { TopicCardCarousel } from "./TopicCardCarousel"
import { useTopicCardStates } from "../../board/hooks/useTopicCardStates"
import { TopicCard } from "../../board/model/TopicCard"

interface TopicCardCarouselContainerProps {
  userId: string
  topicCards: TopicCard[]
  className?: string
}

// 개선된 Skeleton 컴포넌트
const TopicCardSkeleton: React.FC = () => (
  <div className="relative mx-auto flex h-[420px] min-h-[420px] w-full max-w-[360px] animate-pulse flex-col items-center justify-between overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:h-[480px] sm:min-h-[480px]">
    {/* 액션 버튼 자리 */}
    <div className="absolute right-3 top-3 z-10 flex gap-2">
      <div className="size-11 rounded-full bg-zinc-100 dark:bg-zinc-800" />
      <div className="size-11 rounded-full bg-zinc-100 dark:bg-zinc-800" />
    </div>
    {/* Quote 아이콘 자리 */}
    <div className="mb-2 size-8 rounded bg-zinc-100 dark:bg-zinc-800" />
    {/* 타이틀/설명 자리 */}
    <div className="flex w-full flex-1 flex-col items-center justify-center">
      <div className="mb-2 h-6 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="mb-1 h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="mb-1 h-4 w-5/6 rounded bg-zinc-100 dark:bg-zinc-800" />
      <div className="h-4 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
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
        <div className="flex h-[180px] max-w-[90vw] items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-4 text-red-600 shadow-md sm:max-w-xs md:max-w-sm lg:max-w-md">
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