import * as React from "react"
import { TopicCardCarousel } from "./TopicCardCarousel"
import { useTopicCardStates } from "../../board/hooks/useTopicCardStates"
import { TopicCard } from "../../board/model/TopicCard"
import { toast } from "sonner"
import { type CarouselApi } from "./Carousel"

interface TopicCardCarouselContainerProps {
  userId: string
  topicCards: TopicCard[]
  className?: string
}

// 간단한 Skeleton 컴포넌트
const TopicCardSkeleton: React.FC = () => (
  <div className="max-w-[90vw] sm:max-w-xs md:max-w-sm lg:max-w-md bg-gray-100 rounded-2xl shadow-md p-4 h-[180px] animate-pulse flex flex-col justify-between">
    <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
    <div className="h-4 bg-gray-200 rounded w-full mb-1" />
    <div className="h-4 bg-gray-200 rounded w-5/6 mb-1" />
    <div className="h-4 bg-gray-200 rounded w-1/2" />
    <div className="mt-4 h-9 bg-gray-200 rounded" />
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
    toast("북마크된 글감은 곧 가장 먼저 보여드릴게요")
  }

  // 숨김 클릭 핸들러
  const handleHideClick = (topicId: string) => {
    toggleHide(topicId)
    // 숨김 후 자동 다음 카드로 이동
    if (carouselApiRef.current) {
      carouselApiRef.current.scrollNext()
    }
  }

  if (isLoading) {
    // Skeleton 3개 표시
    return (
      <div className={className}>
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
      <div className={className}>
        <div className="max-w-[90vw] sm:max-w-xs md:max-w-sm lg:max-w-md bg-red-50 border border-red-200 rounded-2xl shadow-md p-4 h-[180px] flex items-center justify-center text-red-600">
          글감 정보를 불러오지 못했습니다. 새로고침 해주세요.
        </div>
      </div>
    )
  }

  return (
    <TopicCardCarousel
      topicCards={visibleCards}
      cardStates={cardStates}
      onBookmarkClick={handleBookmarkClick}
      onHideClick={handleHideClick}
      isBookmarking={isBookmarking}
      isHiding={isHiding}
      className={className}
      setCarouselApi={(api: CarouselApi) => (carouselApiRef.current = api)}
    />
  )
} 