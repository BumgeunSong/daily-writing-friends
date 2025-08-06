import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { fetchTopicCardStates, updateTopicCardState } from "../api/topicCard"
import { TopicCard } from "../model/TopicCard"

export function useTopicCardStates(userId: string, topicCards: TopicCard[]) {
  const queryClient = useQueryClient()
  const topicIds = topicCards.map(c => c.id)

  // 전체 상태 fetch (topicIds만 의존)
  const {
    data: cardStates = {},
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["topicCardStates", userId, topicIds.join(",")],
    queryFn: () => fetchTopicCardStates(userId, topicIds),
    enabled: !!userId && topicIds.length > 0,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 30,
  })

  // Optimistic UI: 북마크 토글
  const { mutate: toggleBookmark, isLoading: isBookmarking } = useMutation({
    mutationFn: async (topicId: string) => {
      const prev = cardStates[topicId] || {}
      const next = { ...prev, bookmarked: !prev.bookmarked }
      // Optimistic update
      queryClient.setQueryData(["topicCardStates", userId, topicIds.join(",")], {
        ...cardStates,
        [topicId]: next,
      })
      try {
        await updateTopicCardState(userId, topicId, next)
      } catch (e) {
        // 롤백
        queryClient.setQueryData(["topicCardStates", userId, topicIds.join(",")], cardStates)
        throw e
      }
      return topicId
    },
    // Firestore 성공 후 refetch로 동기화
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topicCardStates", userId] })
    },
    onError: () => {
      toast.error("북마크 처리 중 오류가 발생했습니다.")
    },
  })

  // Optimistic UI: 숨김 토글
  const { mutate: toggleHide, isLoading: isHiding } = useMutation({
    mutationFn: async (topicId: string) => {
      const prev = cardStates[topicId] || {}
      const next = { ...prev, deleted: !prev.deleted }
      // Optimistic update
      queryClient.setQueryData(["topicCardStates", userId, topicIds.join(",")], {
        ...cardStates,
        [topicId]: next,
      })
      try {
        await updateTopicCardState(userId, topicId, next)
      } catch (e) {
        // 롤백
        queryClient.setQueryData(["topicCardStates", userId, topicIds.join(",")], cardStates)
        throw e
      }
      return topicId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topicCardStates", userId] })
    },
    onError: () => {
      toast.error("숨김 처리 중 오류가 발생했습니다.")
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