import * as React from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "./Carousel"
import { Star, StarOff, X } from "lucide-react"
import { useTopicCardStates } from "../hooks/useTopicCardStates"

export type TopicCard = {
  id: string
  title: string
  description: string
  createdAt: any // Timestamp (firebase)
  createdBy: string
}

type TopicCardState = {
  bookmarked?: boolean
  hidden?: boolean
}

type TopicCardCarouselProps = {
  topicCards: TopicCard[]
  cardStates?: Record<string, TopicCardState> // topicId -> state
  onBookmarkClick?: (topicId: string) => void
  onHideClick?: (topicId: string) => void
  className?: string
}

export const TopicCardCarousel: React.FC<TopicCardCarouselProps> = ({
  topicCards,
  cardStates = {},
  onBookmarkClick,
  onHideClick,
  className,
}) => {
  return (
    <div className={className}>
      <div className="relative">
        <Carousel className="w-full max-w-full px-2 sm:px-0">
          <CarouselContent>
            {topicCards.map((card) => {
              const state = cardStates[card.id] || {}
              return (
                <CarouselItem
                  key={card.id}
                  className="max-w-[90vw] sm:max-w-xs md:max-w-sm lg:max-w-md flex-shrink-0"
                >
                  <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col h-full min-h-[180px] justify-between transition-shadow hover:shadow-lg focus-within:shadow-lg relative">
                    {/* 버튼 그룹: 카드 우상단 */}
                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                      <button
                        type="button"
                        aria-label={state.bookmarked ? "북마크 해제" : "북마크"}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary/60 shadow transition"
                        onClick={() => onBookmarkClick?.(card.id)}
                        tabIndex={0}
                      >
                        {state.bookmarked ? (
                          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        ) : (
                          <Star className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="숨김"
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-destructive/60 shadow transition"
                        onClick={() => onHideClick?.(card.id)}
                        tabIndex={0}
                      >
                        <X className="w-6 h-6 text-gray-400" />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 text-gray-900 truncate">
                        {card.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 line-clamp-3">
                        {card.description}
                      </p>
                    </div>
                    {/* CTA 등은 추후 확장 */}
                  </div>
                </CarouselItem>
              )
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  )
}

interface TopicCardCarouselContainerProps {
  userId: string
  topicCards: TopicCard[]
  className?: string
}

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

  // 숨김된 카드는 제외, 북마크된 카드는 상단 정렬
  const visibleCards = React.useMemo(() => {
    return topicCards
      .filter((card) => !cardStates[card.id]?.deleted)
      .sort((a, b) => {
        const aBookmarked = !!cardStates[a.id]?.bookmarked
        const bBookmarked = !!cardStates[b.id]?.bookmarked
        if (aBookmarked === bBookmarked) return 0
        return aBookmarked ? -1 : 1
      })
  }, [topicCards, cardStates])

  return (
    <TopicCardCarousel
      topicCards={visibleCards}
      cardStates={cardStates}
      onBookmarkClick={toggleBookmark}
      onHideClick={toggleHide}
      className={className}
    />
  )
} 