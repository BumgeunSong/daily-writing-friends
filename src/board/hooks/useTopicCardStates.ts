import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchTopicCardStates, updateTopicCardState, TopicCard } from "../api/topicCard"

export function useTopicCardStates(userId: string, topicCards: TopicCard[]) {
  const queryClient = useQueryClient()

  // 전체 상태 fetch
  const {
    data: cardStates = {},
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["topicCardStates", userId, topicCards.map((c) => c.id).join(",")],
    queryFn: () => fetchTopicCardStates(userId, topicCards),
    enabled: !!userId && topicCards.length > 0,
  })

  // 북마크 토글
  const { mutate: toggleBookmark, isLoading: isBookmarking } = useMutation({
    mutationFn: async (topicId: string) => {
      const prev = cardStates[topicId] || {}
      const next = { ...prev, bookmarked: !prev.bookmarked }
      await updateTopicCardState(userId, topicId, next)
      return topicId
    },
    onSuccess: (topicId) => {
      queryClient.invalidateQueries({ queryKey: ["topicCardStates", userId] })
    },
  })

  // 숨김 토글
  const { mutate: toggleHide, isLoading: isHiding } = useMutation({
    mutationFn: async (topicId: string) => {
      const prev = cardStates[topicId] || {}
      const next = { ...prev, deleted: !prev.deleted }
      await updateTopicCardState(userId, topicId, next)
      return topicId
    },
    onSuccess: (topicId) => {
      queryClient.invalidateQueries({ queryKey: ["topicCardStates", userId] })
    },
  })

  return {
    cardStates,
    toggleBookmark,
    toggleHide,
    isLoading,
    isError,
    isBookmarking,
    isHiding,
    refetch,
  }
} 