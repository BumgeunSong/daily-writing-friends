import { useQuery } from "@tanstack/react-query"
import { fetchAllTopicCards } from "../api/topicCard"
import { TopicCard } from "../model/TopicCard"

/**
 * 모든 TopicCard를 가져오는 커스텀 훅 (캐싱/로딩/에러 지원)
 */
export function useAllTopicCards() {
  return useQuery<TopicCard[]>({
    queryKey: ["allTopicCards"],
    queryFn: fetchAllTopicCards,
    staleTime: 1000 * 60 * 5, // 5분간 fresh
    cacheTime: 1000 * 60 * 30, // 30분간 캐시
    suspense: false, // suspense는 컴포넌트에서 직접 처리
    refetchOnWindowFocus: false,
  })
} 