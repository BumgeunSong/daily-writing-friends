import * as React from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/shared/ui/Carousel"
import { Star, X, Quote } from "lucide-react"
import { Button } from "@/shared/ui/button"
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
  isBookmarking?: boolean
  isHiding?: boolean
  isError?: boolean
  className?: string
}

export const TopicCardCarousel: React.FC<TopicCardCarouselProps & { setCarouselApi?: (api: CarouselApi) => void }> = ({
  topicCards,
  cardStates = {},
  onBookmarkClick,
  onHideClick,
  onStartWriting,
  isBookmarking,
  isHiding,
  isError,
  className,
  setCarouselApi,
}) => {
  return (
    <div className={className}>
      <div className="relative">
        <Carousel className="w-full max-w-full px-2 sm:px-0" opts={{ loop: true }} setApi={setCarouselApi}>
          <CarouselContent>
            {topicCards.map((card) => {
              const state = cardStates[card.id] || {}
              return (
                <CarouselItem
                  key={card.id}
                  className="basis-full max-w-full flex-shrink-0 flex-grow-0 px-2 flex items-center justify-center"
                >
                  <div className="relative bg-white rounded-2xl shadow-md flex flex-col justify-between items-center h-[420px] sm:h-[480px] min-h-[420px] sm:min-h-[480px] w-full max-w-[360px] mx-auto p-6">
                    {/* 버튼 그룹: 카드 우상단 */}
                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                      <button
                        type="button"
                        aria-label={state.bookmarked ? "북마크 해제" : "북마크"}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-white/80 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary/60 shadow transition"
                        onClick={() => onBookmarkClick?.(card.id)}
                        tabIndex={0}
                        disabled={!!isBookmarking}
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
                        disabled={!!isHiding}
                      >
                        <X className="w-6 h-6 text-gray-400" />
                      </button>
                    </div>
                    {/* 상단 Lucide quote 아이콘 */}
                    <Quote className="w-8 h-8 text-gray-300 mb-2" />

                    {/* 제목/설명 */}
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                      <h3 className="text-lg sm:text-xl font-bold text-center text-gray-900 mb-2 break-words">
                        {card.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-500 text-center break-words">
                        {card.description}
                      </p>
                    </div>

                    {/* CTA 버튼 */}
                    <Button
                      size="lg"
                      className="w-full mt-6"
                      aria-label="글쓰기 시작"
                      onClick={() => onStartWriting?.(card)}
                    >
                      글쓰기 시작
                    </Button>
                    {isError && (
                      <div className="mt-2 text-sm text-red-500">오류가 발생했습니다. 다시 시도해 주세요.</div>
                    )}
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