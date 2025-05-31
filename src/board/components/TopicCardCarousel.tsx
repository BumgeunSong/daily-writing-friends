import * as React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/shared/ui/Carousel"
import { Star, X, Quote } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { TopicCard } from "../../board/model/TopicCard"

interface TopicCardState {
  bookmarked?: boolean
  hidden?: boolean
}

interface TopicCardCarouselProps {
  topicCards: TopicCard[]
  cardStates?: Record<string, TopicCardState>
  onBookmarkClick?: (topicId: string) => void
  onHideClick?: (topicId: string) => void
  onStartWriting?: (card: TopicCard) => void
  isBookmarking?: boolean
  isHiding?: boolean
  isError?: boolean
  setCarouselApi?: (api: CarouselApi) => void
}

export const TopicCardCarousel: React.FC<TopicCardCarouselProps> = ({
  topicCards,
  cardStates = {},
  onBookmarkClick,
  onHideClick,
  onStartWriting,
  isBookmarking,
  isHiding,
  isError,
  setCarouselApi,
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const emblaApiRef = React.useRef<CarouselApi | null>(null)

  const handleSetApi = React.useCallback((api: CarouselApi) => {
    emblaApiRef.current = api
    setCarouselApi?.(api)
    if (api) {
      setSelectedIndex(api.selectedScrollSnap())
      api.on("select", () => setSelectedIndex(api.selectedScrollSnap()))
      api.on("reInit", () => setSelectedIndex(api.selectedScrollSnap()))
    }
  }, [setCarouselApi])

  const handleDotClick = (idx: number) => {
    emblaApiRef.current?.scrollTo(idx)
  }

  return (
    <div className="w-full">
      <div className="relative">
        <Carousel
          className="w-full max-w-full px-2 sm:px-0 rounded-2xl overflow-visible"
          opts={{ loop: true }}
          setApi={handleSetApi}
        >
          <CarouselContent className="gap-4 overflow-visible">
            {topicCards.map((card) => {
              const state = cardStates[card.id] || {}
              return (
                <CarouselItem
                  key={card.id}
                  className="basis-full max-w-full flex-shrink-0 flex-grow-0 flex items-center justify-center overflow-visible"
                >
                  <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between items-center h-[420px] sm:h-[480px] min-h-[420px] sm:min-h-[480px] w-full max-w-[360px] mx-auto p-6 transition-shadow duration-200 mx-4 sm:mx-0">
                    {/* 액션 버튼 그룹 */}
                    <div className="absolute top-3 right-3 flex gap-2 z-10">
                      <button
                        type="button"
                        aria-label={state.bookmarked ? "북마크 해제" : "북마크"}
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-white/90 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400 transition"
                        onClick={() => onBookmarkClick?.(card.id)}
                        tabIndex={0}
                        aria-pressed={!!state.bookmarked}
                        disabled={isBookmarking}
                      >
                        {state.bookmarked ? (
                          <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        ) : (
                          <Star className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="숨김"
                        className="w-11 h-11 flex items-center justify-center rounded-full bg-white/90 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-destructive/60 transition"
                        onClick={() => onHideClick?.(card.id)}
                        tabIndex={0}
                        aria-pressed={!!state.hidden}
                        disabled={isHiding}
                      >
                        <X className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                      </button>
                    </div>
                    {/* Quote 아이콘 */}
                    <Quote className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />

                    {/* 타이틀/설명 */}
                    <div className="flex-1 flex flex-col items-center justify-center w-full">
                      <h3 className="text-lg sm:text-xl font-bold text-center text-zinc-900 dark:text-white mb-2 break-words">
                        {card.title}
                      </h3>
                      <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 text-center break-words">
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
        {/* Dot Indicator */}
        {topicCards.length > 1 && (
          <div className="absolute left-0 right-0 flex justify-center gap-2 mt-4 sm:mt-6 bottom-[-32px] sm:bottom-[-40px] z-20 pointer-events-none select-none">
            {topicCards.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`슬라이드 ${idx + 1}로 이동`}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 border border-zinc-300 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  selectedIndex === idx
                    ? "bg-zinc-900 dark:bg-white scale-110 shadow"
                    : "bg-zinc-200 dark:bg-zinc-700 opacity-60"
                } pointer-events-auto`}
                onClick={() => handleDotClick(idx)}
                tabIndex={0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 