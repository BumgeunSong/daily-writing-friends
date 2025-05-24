import * as React from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "./Carousel"
import { Star, StarOff, X } from "lucide-react"
import { Button } from "../ui/button"
import { TopicCard } from "../../board/model/TopicCard"

type TopicCardState = {
  bookmarked?: boolean
  hidden?: boolean
}

type TopicCardCarouselProps = {
  topicCards: TopicCard[]
  cardStates?: Record<string, TopicCardState> // topicId -> state
  onBookmarkClick?: (topicId: string) => void
  onHideClick?: (topicId: string) => void
  onStartWriting?: (card: TopicCard) => void
  className?: string
}

export const TopicCardCarousel: React.FC<TopicCardCarouselProps> = ({
  topicCards,
  cardStates = {},
  onBookmarkClick,
  onHideClick,
  onStartWriting,
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
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 text-gray-900 truncate">
                        {card.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 line-clamp-3">
                        {card.description}
                      </p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        aria-label="글쓰기 시작"
                        onClick={() => onStartWriting?.(card)}
                      >
                        글쓰기 시작
                      </Button>
                    </div>
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