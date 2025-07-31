import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/shared/hooks/useAuth'
import { ContributionGridData } from '@/stats/model/ContributionGrid'
import { fetchAllContributionGrids } from '@/stats/api/contributionGrid'

/**
 * React hook to fetch server-calculated contribution grids using useQuery
 *
 * @returns ContributionGridData with posting and commenting grids, loading, and error states
 */
export function useServerContributionGrid(): ContributionGridData {
  const { currentUser } = useAuth()

  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['contributionGrids', currentUser?.uid],
    queryFn: () => fetchAllContributionGrids(currentUser!.uid),
    enabled: !!currentUser?.uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  })

  const postingGrid = data?.postingGrid || null
  const commentingGrid = data?.commentingGrid || null

  return {
    postingGrid,
    commentingGrid,
    loading,
    error: error as Error | null,
  }
}
