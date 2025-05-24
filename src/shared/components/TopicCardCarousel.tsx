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
        <Carousel className="w-full">
          <CarouselContent>
            {topicCards.map((card) => (
              <CarouselItem key={card.id} className="max-w-xs sm:max-w-sm md:max-w-md">
                <div className="bg-white rounded-xl shadow p-4 flex flex-col h-full min-h-[180px] justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900 truncate">{card.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-3">{card.description}</p>
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