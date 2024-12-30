// call api to get writing stats
// return writing stats
import { useQuery } from '@tanstack/react-query'
import { WritingStats } from "@/types/WritingStats"

const fetchWritingStats = async (): Promise<WritingStats[]> => {
    const response = await fetch('https://getwritingstats-ifrsorhslq-uc.a.run.app/')
    if (!response.ok) {
        throw new Error('Network response was not ok')
    }
    return response.json()
}
export const useWritingStats = () => {
    const { data: writingStats, isLoading, error } = useQuery<WritingStats[], Error>({
        queryKey: ['writingStats'],
        queryFn: fetchWritingStats,
        staleTime: 1000 * 60 * 1, // 1 minutes
        cacheTime: 1000 * 60 * 3, // 3 minutes
    })

    return { writingStats, isLoading, error }
}