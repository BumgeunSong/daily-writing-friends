import { Star, X, Quote } from "lucide-react"
import * as React from "react"
import { Button } from "@/shared/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/shared/ui/Carousel"
import { TopicCard } from "../../board/model/TopicCard"

interface TopicCardState {
  bookmarked?: boolean
  deleted?: boolean
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
          className="w-full max-w-full overflow-visible rounded-2xl px-2 sm:px-0"
          opts={{ loop: true }}
          setApi={handleSetApi}
        >
          <CarouselContent className="gap-4 overflow-visible">
            {topicCards.map((card) => {
              const state = cardStates[card.id] || {}
              return (
                <CarouselItem
                  key={card.id}
                  className="flex max-w-full shrink-0 grow-0 basis-full items-center justify-center overflow-visible"
                >
                  <div className="relative mx-auto flex h-[420px] min-h-[420px] w-full max-w-[360px] flex-col items-center justify-between rounded-2xl border border-zinc-200 bg-white p-6 transition-shadow duration-200 dark:border-zinc-800 dark:bg-zinc-900 sm:mx-0 sm:h-[480px] sm:min-h-[480px]">
                    {/* 액션 버튼 그룹 */}
                    <div className="absolute right-3 top-3 z-10 flex gap-2">
                      <button
                        type="button"
                        aria-label={state.bookmarked ? "북마크 해제" : "북마크"}
                        className="flex size-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        onClick={() => onBookmarkClick?.(card.id)}
                        tabIndex={0}
                        aria-pressed={!!state.bookmarked}
                        disabled={isBookmarking}
                      >
                        {state.bookmarked ? (
                          <Star className="size-6 fill-yellow-400 text-yellow-400" />
                        ) : (
                          <Star className="size-6 text-zinc-400 dark:text-zinc-500" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="숨김"
                        className="flex size-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-destructive/60 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        onClick={() => onHideClick?.(card.id)}
                        tabIndex={0}
                        aria-pressed={!!state.deleted}
                        disabled={isHiding}
                      >
                        <X className="size-6 text-zinc-400 dark:text-zinc-500" />
                      </button>
                    </div>
                    {/* Quote 아이콘 */}
                    <Quote className="mb-2 size-8 text-zinc-300 dark:text-zinc-600" />

                    {/* 타이틀/설명 */}
                    <div className="flex w-full flex-1 flex-col items-center justify-center">
                      <h3 className="mb-2 break-words text-center text-lg font-bold text-zinc-900 dark:text-white sm:text-xl">
                        {card.title}
                      </h3>
                      <p className="break-words text-center text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">
                        {card.description}
                      </p>
                    </div>

                    {/* CTA 버튼 */}
                    <Button
                      variant="default"
                      size="lg"
                      className="mt-6 w-full"
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
          <div className="pointer-events-none absolute inset-x-0 bottom-[-32px] z-20 mt-4 flex select-none justify-center gap-2 sm:bottom-[-40px] sm:mt-6">
            {topicCards.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`슬라이드 ${idx + 1}로 이동`}
                className={`size-2.5 rounded-full border border-zinc-300 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 ${
                  selectedIndex === idx
                    ? "scale-110 bg-zinc-900 shadow dark:bg-white"
                    : "bg-zinc-200 opacity-60 dark:bg-zinc-700"
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