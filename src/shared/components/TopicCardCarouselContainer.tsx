import * as React from "react"
import { TopicCardCarousel } from "./TopicCardCarousel"
import { useTopicCardStates } from "../../board/hooks/useTopicCardStates"
import { TopicCard } from "../../board/model/TopicCard"

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