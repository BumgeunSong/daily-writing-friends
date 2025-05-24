import * as React from "react"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "./Carousel"

export type TopicCard = {
  id: string
  title: string
  description: string
  createdAt: any // Timestamp (firebase)
  createdBy: string
}

type TopicCardCarouselProps = {
  topicCards: TopicCard[]
  className?: string
}

export const TopicCardCarousel: React.FC<TopicCardCarouselProps> = ({ topicCards, className }) => {
  return (
    <div className={className}>
      <div className="relative">
        <Carousel className="w-full max-w-full px-2 sm:px-0">
          <CarouselContent>
            {topicCards.map((card) => (
              <CarouselItem
                key={card.id}
                className="max-w-[90vw] sm:max-w-xs md:max-w-sm lg:max-w-md flex-shrink-0"
              >
                <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col h-full min-h-[180px] justify-between transition-shadow hover:shadow-lg focus-within:shadow-lg">
                  <div>
                    <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 text-gray-900 truncate">
                      {card.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 line-clamp-3">
                      {card.description}
                    </p>
                  </div>
                  {/* CTA, 북마크/삭제 버튼 등은 추후 확장 */}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  )
} 